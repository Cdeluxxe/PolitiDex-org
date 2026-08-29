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

   THREE SHAPES OF CARD, one per shape of verdict the engine can reach:
     contradicts  the stated position and the vote point opposite ways
     consistent   they point the same way
     mixed        the record runs BOTH ways — the split card, which cites one
                  named vote on each side and prints the counts as counts. It is
                  offered only where the engine already says mixed, and it has to
                  clear every guard twice (once per cited vote) to exist at all.
                  Before it existed, the deepest, least dismissible rows in the
                  app — the ones with evidence on both sides — were the only ones
                  that could not travel.

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
  //
  // SPLIT, August 2026 — three of the four entries that used to live here are
  // gone, because the keys behind them were narrowed until "Supports" meant one
  // thing. The test for a hold was always: can ONE measure mapping be right for
  // every stance filed on this key? Where the answer was no, the key was an
  // umbrella and the verdict was an accident of filing. That is now fixed at the
  // taxonomy level (alignment-tool.js) and in the mapping table
  // (20260904000000_vr_split_umbrella_issue_keys.sql) rather than papered over
  // here:
  //
  //   gov_regulation → narrowed to cutting the number and cost of federal rules,
  //     with permitting_reform taking project review. The four mappings whose
  //     sign was inverted (statutes that CREATE a regime, filed yea_supports on
  //     a cut-the-rules chip) were removed, and the one card filed against its
  //     own author's position (French Hill, who sponsored the CFPB overdraft
  //     rescission and was printed as opposing deregulation) was corrected.
  //   america_first_fp → narrowed to foreign aid and open-ended commitments.
  //     War-powers stances moved to war_powers, counter-China stances to
  //     strong_defense. AOC and Boebert can no longer be filed identically here
  //     and vote opposite ways on the same amendment.
  //   states_federal_power → narrowed to preemption, one boundary. Suing
  //     Washington moved to state_standing, command of the Guard to
  //     guard_authority.
  //
  // Nothing in publicShareBlock() moved to make room for them. A card on a
  // narrowed key still has to clear PUBLIC_MIN_JUDGED and every guard above; the
  // narrow keys are individually thinner than the umbrella was, so some pairs
  // that used to be scored are now honestly untested rather than quietly wrong.
  var WAVE1_HOLD_ISSUE_KEYS = {
    // checks_balances is the one entry that stays, and it is no longer a wave-1
    // deferral — it is permanent. The key was split into war_powers,
    // judicial_check, power_of_purse, congress_oversight, state_standing and
    // guard_authority, and everything mechanism-specific went to one of those.
    // What is deliberately left behind is the general institutional-posture
    // chip: "keep Congress and the courts as a real check on executive power,
    // whoever is president". A stance filed there is a statement of general
    // posture, and no roll call adjudicates a general posture — which is why the
    // key ends the split holding exactly one mapping (a birthright-citizenship
    // suit, no roll calls) and is expected to keep none. A card here would print
    // a verdict without being able to name the mechanism it was scored on, which
    // is the original defect, so it stays held rather than being unblocked by
    // the split that fixed the other three.
    checks_balances: 'held permanently — the key is the general institutional-posture chip left behind by the August 2026 split, and a general posture has no roll call that settles it; members with a specific claim are on war_powers, judicial_check, power_of_purse, congress_oversight, state_standing or guard_authority instead'
  };

  // ── Guard 17 · the stance and the vote are about different subjects ───────
  // The umbrella-key holds above catch keys whose SAID side is incoherent. This
  // catches the other direction: a key whose said side is perfectly coherent,
  // paired with a measure that is about something else. The mapping may be a
  // defensible aggregate signal inside the app; off-app it prints a member's
  // position on subject A above a roll call on subject B.
  //
  // Every entry below was found by reading the stances behind the live cards on
  // that pair against the measure's own title, not by string overlap. Keyed by
  // "<measure number> :: <issue key>" so a repaired mapping lifts one pair, not
  // a whole key, and so the audit can name the mismatch.
  //
  // Not repaired here: the request for this pass is explicit that new mappings
  // are not to be invented, and none of these has an existing curated rationale
  // that would support a corrected one.
  var WAVE1_HOLD_PAIRS = {
    // 31 cards. Every stance filed here is about AI, platform or child-safety
    // guardrails — Wyden on algorithmic-impact assessments, Blackburn on the
    // Kids Online Safety Act, Markey on children's online privacy. The GENIUS
    // Act is a stablecoin reserve-and-disclosure statute. It does not adjudicate
    // any of them.
    'S. 1582 :: tech_balance': 'held out of wave 1 — the stances on this key are about AI and platform guardrails while the cited vote is a stablecoin statute, so the card would pair a position with a roll call on a different subject',
    // 4 cards, 2 members, both of them CHIPS and Science Act authors writing
    // about semiconductors and export controls.
    'S. 1582 :: tech_innovation': 'held out of wave 1 — the stances on this key are about semiconductors and domestic chip manufacturing while the cited vote is a stablecoin statute',
    // 10 cards. TAKE IT DOWN is a non-consensual-imagery takedown mandate; the
    // stances behind it include right-to-repair, autonomous-systems policy and
    // semiconductor export controls.
    'S. 146 :: tech_balance': 'held out of wave 1 — the stances on this key range from right-to-repair to export controls while the cited vote is a content-removal mandate, so one mapping cannot be right for them',
    // 2 cards. The measure is the Protection of Women and Girls in Sports Act;
    // the stance is about school funding and student achievement. The same
    // measure's lgbtq_rights mapping is on point and still ships.
    'H.R. 28 :: public_schools': 'held out of wave 1 — the stance is about school funding and student achievement while the cited vote is on athletic eligibility under Title IX',
    // 2 cards. H.Amdt. 251 (Crane) bars DoD from paying foreign personnel costs
    // in joint exercises; the stance is about conditioning arms transfers.
    'H.Amdt. 251 :: foreign_balance': 'held out of wave 1 — the stance is about conditioning arms transfers while the cited vote is on who pays for joint military exercises',
    // 1 card. H.Amdt. 255 (Mace) excludes gender-related care from TRICARE; the
    // stance is about minority health disparities.
    'H.Amdt. 255 :: healthcare': 'held out of wave 1 — the stance is about minority health disparities while the cited vote narrows a specific category of military health coverage',
    // 2 cards. The Digital Asset Market Clarity Act against a stance about
    // rebuilding domestic manufacturing and chips.
    'H.R. 3633 :: econ_growth': 'held out of wave 1 — the stances on this key are about domestic manufacturing while the cited vote is a digital-asset market-structure bill'
  };

  // ── Guard 16 · a mapping that records a framing, not an effect ────────────
  // Some curated rationales do not say what the measure does. They say what one
  // side SAID it does — and several say so explicitly:
  //
  //   H.J.Res. 88 · energy_production — "Supporters framed it as protecting
  //   consumer choice and gasoline-vehicle access."   (39 live cards)
  //   H.R. 1919 · tech_balance — "Recorded neutrally: critics argue a blanket
  //   bar forecloses a payments technology other central banks are piloting."
  //
  // The curator's own words disclaim the directional claim; the card then prints
  // that mapping as a verdict with a stamp on it. "Recorded neutrally" means
  // recorded, not judged, and a share card is nothing but a judgment.
  //
  // Only mappings that LEAD with the framing are refused. A rationale that
  // states the measure's own effect and then notes how a side characterised it
  // — "Creates the first comprehensive U.S. market-structure regime for digital
  // assets, which supporters say ends regulatory limbo" — is a fact with context
  // attached, and it still ships.
  var RATIONALE_NEUTRAL_RE = /recorded neutrally/i;
  var RATIONALE_FRAMING_RE = /^\s*(?:framed by\s+)?(?:supporters?|opponents?|critics?|detractors?|proponents?|some\s+[a-z-]+(?:\s+[a-z-]+)?\s+(?:groups?|advocates?|universities|organizations?))\b/i;

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
  // "voting for the Laken Riley Act" is the same circular receipt as "voted for"
  // it, and the old pattern read only the past tense — one live stance walked
  // through the gap on that participle alone.
  var VOTE_VERB_RE = /\b(vot(?:ed|ing)|vote[sd]? (?:for|against)|cosponsor|co-sponsor|sponsored|roll call)\b/i;

  // ── Guard 11 · duplicated measure identity ────────────────────────────────
  // Two vr_measures rows for the same bill number each carried the same curated
  // issue mapping, so the same bill appeared twice under one issue. The durable
  // fix is the migration that merges those identities
  // (20260802000000_vr_merge_duplicate_joint_resolution_identities.sql). This is
  // the client-side backstop for a database that has not applied it yet: if the
  // warm record set shows one bill NUMBER arriving under two different
  // measureIds on the same issue, no card cites that bill.

  // ── Guard 15 · a stated position that is not independent of the vote ──────
  // Guard 10 asks whether the SAID text is a vote. It reads one field. A stance
  // row also carries `evidence` and `source`, and the two cards known to refute
  // themselves on public view are both caught there rather than in the text:
  //
  //   kclark / healthcare — evidence "H.R. 1 passed 218–214, Roll Call 190",
  //   source https://clerk.house.gov/Votes/2025190. That URL is, character for
  //   character, the citation the card prints as the DID side. The card compares
  //   a vote to a description of that same vote and stamps the result a
  //   contradiction.
  //
  //   jeffries / national_debt — "Anchored HIS OPPOSITION in the CBO's ~$3.4T
  //   deficit …". Opposition to H.R. 1, sourced to a TIME piece about the H.R. 1
  //   speech. Filed as `national_debt: oppose`, which the engine reads as
  //   opposing the GOAL, so his Nay on the debt-increasing bill scores as a
  //   contradiction while the printed quote plainly agrees with the printed vote.
  //
  // Both are the same root cause: `issueStance` recording a position on a BILL
  // where the issue key names a GOAL. That inverts the sign whenever the two
  // point opposite ways, and it is not repairable from the sources on file —
  // TIME establishes that Jeffries attacked H.R. 1 partly on deficit grounds,
  // not that he holds debt reduction as an aim. So this refuses rather than
  // rewrites: the four signals below are structural, they only ever remove a
  // card, and a false positive costs a share instead of a reader's trust.
  var ROLLCALL_URL_RE = /(clerk\.house\.gov\/votes\/|senate\.gov\/legislative\/lis\/roll_call_votes\/|roll_?call)/i;
  // A standing position is stated in the member's own terms ("warns the debt is
  // unsustainable"). These read instead as a reaction aimed at one legislative
  // vehicle, which is a description of a vote however it is phrased. Deliberately
  // narrow — three stances in the live corpus match, and all three are circular.
  var REACTION_RE = [
    /\b(?:his|her|their)\s+(?:opposition|support)\b/i,
    /\bopposition to\b/i,
    /\b(?:hold|held|holding|rally|rallied|whipp?(?:ed|ing)?)\b[^.;]{0,40}\bagainst\b/i,
    /\b(?:against|behind|for) the\b[^.,;]{0,70}\bAct\b/i
  ];

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
  // Zero-width joiners and BOMs travel invisibly through a label and then show
  // up as a tofu box on whichever phone renders the share text. One label in
  // ISSUE_MAP opens with a bare ZWJ before its emoji, and because \s does not
  // match a format character the icon split below failed on it outright: the
  // card fell back to the generic 🎯 while still printing the real emoji inside
  // the label ("‍🌈 Protect LGBTQ+ Rights"), so the same card carried two icons,
  // one of them wrong. Stripped here rather than in ISSUE_MAP so nothing outside
  // the share path changes.
  var ZERO_WIDTH_RE = /[​-‏⁠﻿]/g;
  function issueMeta(key) {
    var im = (window.ISSUE_MAP) || {};
    var def = key && im[key];
    if (!def || !def.label) return null;
    var label = String(def.label).replace(ZERO_WIDTH_RE, '').trim();
    if (!label) return null;
    var m = label.match(/^\s*(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u);
    return m ? { icon: m[1], label: m[2] || label } : { icon: '🎯', label: label };
  }
  function issueLabel(key) {
    var im = issueMeta(key);
    return im ? im.label : String(key || '');
  }
  function titleCase(s) {
    return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  // The stored `result` is a ledger token, not a caption: the corpus holds
  // "passed", "Passed", "failed", "agreed_to" and "rejected" side by side. On a
  // share image the last line of the fact block read "House · agreed_to" — a raw
  // enum with an underscore, on the one artefact whose whole job is looking like
  // a public record rather than a database dump — and two cards from the same
  // starter set read "House · passed" and "House · Passed". Sentence case, one
  // space for the underscore. Nothing about the outcome changes; only the casing
  // the reader sees does, so this stays source-faithful.
  function resultLabel(s) {
    var t = String(s || '').replace(/_/g, ' ').trim();
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
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
  //
  // "Both public chambers" above means both FEDERAL chambers. Everything in this
  // block is about Congress; a state chamber's votes are refused, and the reason
  // is written out at STATE CHAMBERS below rather than left to be inferred here.
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
  // (No source URL this function is ever asked to print carries a query or a
  // fragment: the derived federal shapes have none, and the one ledger source
  // that does — a state chamber's query-addressed vote page — never reaches a
  // card, because guard 12 refuses it upstream for a different and larger reason.
  // A query-carrying URL that did arrive here would be refused by cite() rather
  // than silently truncated.)
  function printableUrl(u) {
    return String(u || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }
  function cite(url, label) {
    if (/[?#]/.test(url)) return null;         // a stripped query would cite the wrong thing
    var print = printableUrl(url);
    if (!print || print.length > VERIFY_MAX) return null;
    return { url: url, print: print, label: label };
  }
  // Two addresses that resolve to the same page. Scheme, www and a trailing
  // slash are the only differences the ledger actually shows between a stance
  // source and the citation built from a roll call, so those are the only ones
  // normalised — nothing about the path is loosened.
  function sameAddress(a, b) {
    var f = function (u) { return printableUrl(u).replace(/\/+$/, '').toLowerCase(); };
    var x = f(a), y = f(b);
    return !!x && x === y;
  }
  // ── State chambers ────────────────────────────────────────────────────────
  // A Utah roll call carries everything a citation needs — le.utah.gov publishes
  // a per-member vote page for each one, and the ingest stores its address — and
  // it is still refused here, on purpose.
  //
  // Two things stand in the way, and only one of them is cosmetic. The cosmetic
  // one: those pages are addressed by query string (`svotes.jsp?sessionid=2025GS&
  // voteid=1651&house=H`), where every federal citation this module prints is
  // addressed by path. The one that decides it: NOTHING HAS READ THEM. Guard 14's
  // denylist publishes a new federal citation by default because
  // scripts/vr-check-citations.mjs fetches every derivable address, confirms the
  // page names the roll call we cited, and cross-checks the measure against the
  // chamber's own structured record — it knows two page shapes, both federal.
  // Printing a state address would put an unread link on the one surface that
  // travels without its context, which is the exact trade guard 14 exists to
  // refuse. So the chamber is NAMED here rather than falling through to the
  // generic "we could not derive one" — a curator reading audit() gets the real
  // reason and the real unblock, instead of a message that says the roll number
  // is missing when it is sitting right there.
  //
  // What unblocks it: a Utah reader in scripts/vr-check-citations.mjs (a page
  // parser for svotes.jsp, and a fetch that survives le.utah.gov's WAF — Node's
  // fetch is rejected outright, curl with browser headers is not), after which
  // this branch becomes a citation instead of a refusal. See § Utah in
  // db/vr-ingest-runbook.md.
  var STATE_CHAMBERS = { 'utah house': 1, 'utah senate': 1 };
  function isStateChamber(item) {
    return !!STATE_CHAMBERS[String((item && item.chamber) || '').toLowerCase().trim()];
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
  // ══════════════════════════════════════════════════════════════════════════
  // FORMAL INSTRUMENTS  ·  what KIND of act is this, and what may it claim?
  // ──────────────────────────────────────────────────────────────────────────
  // The formal record has never been only roll calls. vr_positions has carried
  // signings, vetoes, issued executive actions, sponsorships, cosponsorships,
  // on-record statements, amicus filings and litigation postures since it was
  // created, every one of them already scored by the SAME engine that scores a
  // vote (stance-helpers.js `_voteEffectiveSupport` branches on kind ===
  // 'position' and reads the boolean `supports`). They are on the row face, they
  // are inside Direction Match, and until now the one thing they could not do was
  // leave the app: guard 5 refused anything whose kind was not 'vote', because a
  // card that says "the record shows … voted Yea" over a cosponsorship is a lie
  // about the mechanism even when it is right about the direction.
  //
  // The fix is not to loosen that guard. It is to stop making the card say
  // "voted" when the act was not a vote. Every instrument below names itself on
  // the card, in the chamber's own vocabulary, and carries a `strength`:
  //
  //   deciding    the act itself disposes of the thing — a recorded floor vote,
  //               a signature, a veto, an executive action taken under the
  //               president's own authority. It settled something.
  //   supporting  the act is on the record and is real evidence of a position,
  //               and it decided nothing on its own — a cosponsorship, a
  //               statement, a brief, a committee vote. Shown for transparency,
  //               never worded as though it were the deciding vote.
  //
  // `note` is the sentence that says which of the two a reader is looking at. It
  // is printed in the card's first, PROTECTED fact slot (see supportingParts), so
  // it is the one clause the renderer's line budget can never drop — the same
  // treatment the disapproval "what a yea did" sentence gets, and for the same
  // reason: it is the clause a reader cannot reconstruct from the rest of the
  // card, and getting it wrong inverts the meaning of the whole image.
  //
  // WHAT THIS DOES NOT DO. It does not touch Direction Match. Nothing here
  // weights, re-weights or re-signs anything: a cosponsorship counted exactly as
  // much before this file could print it as it does after, and a signature that
  // was already inside the score is still inside it on the same terms. The only
  // thing that changed is whether the reader can take the receipt with them.
  //
  // `did` is the same act stated as a short sentence with the item's own identity
  // in it, for the one-line "Did:" a post has room for. Composed here rather than
  // in the renderer because this is the file that owns the vocabulary.
  //
  // An instrument this table does not know is REFUSED (guard 5). A slug with no
  // honest label is a card that would have to invent one.
  var INSTRUMENTS = {
    vote: {
      key: 'vote', label: 'Recorded floor vote', strength: 'deciding',
      note: '', did: ''
    },
    signed: {
      key: 'signed', label: 'Signed into law', strength: 'deciding',
      note: 'Signed into law — a formal act with legal effect, not a floor vote.',
      did: 'Signed {n} into law'
    },
    vetoed: {
      key: 'vetoed', label: 'Vetoed', strength: 'deciding',
      note: 'A veto — a formal act with legal effect, not a floor vote.',
      did: 'Vetoed {n}'
    },
    // The label narrows to the document type the number names (see EXEC_DOC).
    issued: {
      key: 'issued', label: 'Issued executive action', strength: 'deciding',
      note: 'Issued under executive authority — a unilateral act, not a floor vote.',
      did: 'Issued {n}'
    },
    sponsor: {
      key: 'sponsor', label: 'Sponsored', strength: 'supporting',
      note: 'Sponsoring puts a name to a bill on the record. It is not a vote on it.',
      did: 'Sponsored {n}'
    },
    cosponsor: {
      key: 'cosponsor', label: 'Cosponsored', strength: 'supporting',
      note: 'Cosponsoring puts a name to a bill on the record. It is not a vote on it.',
      did: 'Cosponsored {n}'
    },
    statement: {
      key: 'statement', label: 'On-record statement', strength: 'supporting',
      note: 'A position stated on the record. It is not a vote.',
      did: 'On-record statement — {n}'
    },
    amicus: {
      key: 'amicus', label: 'Filed an amicus brief', strength: 'supporting',
      note: 'A formal court filing. It is not a vote.',
      did: 'Filed an amicus brief — {n}'
    },
    plaintiff: {
      key: 'plaintiff', label: 'Party to the case', strength: 'supporting',
      note: 'A formal litigation posture entered in court. It is not a vote.',
      did: 'Party to the case — {n}'
    },
    committee_vote: {
      key: 'committee_vote', label: 'Recorded committee vote', strength: 'supporting',
      note: 'A recorded vote in committee, not on the floor.',
      did: 'Recorded committee vote — {n}'
    }
  };
  // vr_positions stores one slug — 'issued' — for every unilateral presidential
  // document, and the document type is carried in the number the Federal Register
  // assigns it ("Executive Order 14418", "Proclamation 11043"). A card that says
  // only "Issued" leaves the reader to guess which of those they are looking at,
  // so the label is narrowed from the identity the record already carries. An
  // unrecognised number keeps the general label rather than guessing.
  var EXEC_DOC = [
    { re: /^\s*executive\s+order\b/i, label: 'Issued executive order' },
    { re: /^\s*proclamation\b/i, label: 'Issued proclamation' },
    { re: /^\s*(?:presidential\s+)?memorand(?:um|a)\b/i, label: 'Issued presidential memorandum' }
  ];
  function instrumentOf(item) {
    if (!item) return null;
    if (item.kind === 'vote') return INSTRUMENTS.vote;
    if (item.kind !== 'position') return null;
    // `actionType` first; hydrateIssueRecords copies it into all three fields, but
    // a curated position may only carry `action`.
    var slug = String(item.actionType || item.action || item.position || '')
      .toLowerCase().trim().replace(/\s+/g, '_');
    var base = INSTRUMENTS[slug];
    if (!base || base.key === 'vote') return null;   // 'vote' is not a position slug
    if (base.key !== 'issued') return base;
    var num = String(item.number || '');
    for (var i = 0; i < EXEC_DOC.length; i++) {
      if (!EXEC_DOC[i].re.test(num)) continue;
      return { key: base.key, label: EXEC_DOC[i].label, strength: base.strength,
               note: base.note, did: base.did };
    }
    return base;
  }
  // "Cosponsored S. 331" / "Issued Executive Order 14418". '' when the instrument
  // has no short form (a floor vote, which the headline already states in full).
  function didPhrase(instr, number) {
    if (!instr || !instr.did) return '';
    var n = String(number || '').trim();
    if (!n) return '';
    return instr.did.replace('{n}', n);
  }
  // The address printed on a NON-vote card. A roll call has a canonical public
  // page that can be DERIVED from (chamber, congress, session, roll) — see above —
  // and no other instrument does: the record of a signature is the bill page, the
  // record of an executive order is its Federal Register document, the record of a
  // filing is the filing. So the stored URL is used as-is, and it either resolves
  // or the card does not exist. Three things still disqualify it:
  //
  //   · not https — a card is a receipt and a receipt is not carried over http
  //   · a query or a fragment — printableUrl strips neither, and an address that
  //     needs one to land is one a reader retyping from an image will not land
  //   · an api.congress.gov endpoint — returns an API-key error in a browser, the
  //     same defect guard 12 refuses on the vote side
  //
  // Unlike a roll-call citation this one is NOT length-capped here: 118 of the
  // stored document addresses are longer than a footer line, and the fix for that
  // is the split card's fix — print the PolitiDex record page in the footer, which
  // cites the document — not to refuse the receipt or, worse, to shorten a URL.
  // See baseCard.
  function instrumentCitation(item) {
    if (!item || item.kind === 'vote' || !instrumentOf(item)) return null;
    var url = String((item.source && item.source.url) || '').trim();
    if (!/^https:\/\/\S+$/i.test(url)) return null;
    if (/[?#]/.test(url)) return null;
    if (/api\.congress\.gov/i.test(url)) return null;
    var label = String((item.source && item.source.label) || '').trim();
    if (!label) {
      var h = (url.match(/^https:\/\/([^/]+)/i) || [])[1] || '';
      label = h ? h.replace(/^www\./i, '') : 'Official record';
    }
    return { url: url, print: printableUrl(url), label: label };
  }
  // The one place the rest of the file asks "where is this act read?", so a vote
  // and a signature cannot end up on two different rules by accident.
  function citationFor(item) {
    if (!item) return null;
    return item.kind === 'vote' ? canonicalCitation(item) : instrumentCitation(item);
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
    // Guard 5 — what kind of act is this, and is there an honest name for it?
    // The card states the mechanism in the chamber's own words, so an instrument
    // this file has no label for cannot ship: naming it would mean inventing the
    // name. What it no longer does is refuse everything that is not a floor vote —
    // a signature, a veto, an executive action, a cosponsorship and a statement
    // are all real record, all already scored, and all of them say what they are.
    var instr = instrumentOf(item);
    if (!instr) {
      var what = item.kind === 'position'
        ? String(item.actionType || item.action || 'unknown action')
        : String(item.kind || 'unknown');
      return 'not a formal-record instrument with an honest label (' + what + ')';
    }
    if (instr.key === 'vote') {
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
    } else {
      // The same question guard 7 asks a vote, asked of an act: does the record
      // say which WAY it cut, and does it name what was acted on?
      //
      // `supports` is the field the scoring engine already reads for these items,
      // so requiring it here is not a new test — it is the card refusing to print
      // a verdict the engine could not have reached either.
      if (typeof item.supports !== 'boolean') {
        return 'the record does not say which way this act cut, so there is no direction to report';
      }
      if (item.isProcedural || item.advanceInverted) return 'procedural action — the question does not read plainly off-app';
      if (!item.number) return 'the record carries nothing that names what was acted on';
      // A date is required to SHIP (publicShareBlock refuses a card with no date)
      // but not to BUILD: three on-record statements in the ledger carry a source
      // and no date, and the honest handling of that is a card that exists in the
      // app and does not leave it, not a pretended date.
    }
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
  //
  // For every other instrument there is no address to derive — the record of the
  // act IS the stored document — so the question becomes whether that document is
  // one a reader can actually open. See instrumentCitation.
  function blockCitation(item) {
    if (citationFor(item)) return '';
    var u = String((item && item.source && item.source.url) || '');
    if (item && item.kind !== 'vote') {
      if (!u) return 'record carries no source URL';
      if (/api\.congress\.gov/i.test(u)) {
        return 'the only stored source for this act is an api.congress.gov endpoint, which returns an API-key error in a browser';
      }
      if (!/^https:\/\//i.test(u)) return 'the stored source for this act is not an https address a reader could open';
      return 'the stored source for this act carries a query or a fragment, so the address printed on the card would not land on the same page';
    }
    if (/api\.congress\.gov/i.test(u)) {
      return 'the only stored source is an api.congress.gov endpoint and the roll-call number is missing, so no public roll-call page can be derived';
    }
    if (isStateChamber(item)) {
      return 'this is a state-chamber vote: the chamber does publish a per-member vote page and the ledger stores it, but no citation check has ever read that page shape, and an unread address is not a citation';
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

  // Legislative prose is full of full stops that end nothing: "H.R. 6644",
  // "Sec. 103", "42 U.S.C. 4333", "24 C.F.R. 58.34", "H.J.Res. 78". A splitter
  // that treats those as sentence ends shreds a citation across two fragments,
  // and a citation cut in half is worse copy than the note we came to remove.
  // So a break is only taken at a stop followed by space and a capital, and only
  // when what precedes the stop is not one of the shapes below.
  var ABBREV_TAIL_RE = /(?:^|[\s(\[])(?:[A-Za-z]|Sec|Secs|No|Nos|Art|Res|Amdt|Amdts|Div|Doc|Ch|Pt|Cl|Stat|Pub|Cong|Rep|Reps|Sen|Sens|Fed|Reg|Regs|Cir|Ed|Dept|Govt|Comm|Subpt|vol|pp|al|etc|approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|Mr|Mrs|Ms|Dr|St)$/;
  function splitSentences(s) {
    var out = [], start = 0, i = 0, txt = String(s || '');
    for (i = 0; i < txt.length; i++) {
      var c = txt.charAt(i);
      if (c !== '.' && c !== '!' && c !== '?') continue;
      // Run past a closing quote or bracket that belongs to this sentence.
      var j = i;
      while (j + 1 < txt.length && '"\')]”’'.indexOf(txt.charAt(j + 1)) !== -1) j++;
      var after = txt.slice(j + 1);
      // A capital, an opening bracket or quote — or a backtick, which is how the
      // curators quote a raw key mid-note ("…inside a vehicle. `housing`'s
      // published chip is…"). Without the backtick the two sentences stay glued
      // and the reader-facing half is dropped along with the note.
      if (!/^\s+[A-Z(“"`]/.test(after)) continue;
      if (c === '.' && ABBREV_TAIL_RE.test(txt.slice(start, i))) continue;
      out.push(txt.slice(start, j + 1));
      start = j + 1;
    }
    if (start < txt.length) out.push(txt.slice(start));
    return out.map(function (t) { return t.trim(); }).filter(Boolean);
  }
  // ══════════════════════════════════════════════════════════════════════════
  // Curator housekeeping vs public disclosure
  // ══════════════════════════════════════════════════════════════════════════
  // `vr_measure_issues.rationale` is a working field. It carries the sentence a
  // card needs — what the measure does — and, in seventeen places, notes the
  // curators wrote to each other: how heavily the mapping is weighted, which
  // issue it used to be filed under, which provision row it lines up with.
  // Inside the app those notes are provenance sitting next to the thing they
  // qualify. On a card that has left the app they are a stranger's filing system
  // printed as if it were a finding, and the weighting numbers in particular
  // invite a reader to think a score they cannot see decided the verdict.
  //
  // The line between the two is whether the sentence is about the WORLD or about
  // the LEDGER. "Supporters make the opposite case, that one district judge
  // should not set national policy" is about the world: it is disclosure, it
  // stays, and nothing below touches it. "Weighted 80 rather than 100" is about
  // the ledger and goes.
  //
  // Where a housekeeping note carries a real caveat inside it, the caveat is
  // kept and only the bookkeeping frame is removed — "Weighted 80 rather than
  // 100 because this NDAA also carries unrelated social-policy riders (see
  // H.Amdt. 254-256), so passage is not a pure defense-posture signal" ships as
  // "This NDAA also carries unrelated social-policy riders, so passage is not a
  // pure defense-posture signal." No word is added; the frame is cut, the
  // remainder is given its capital back, and the seam is repaired by the same
  // tidyRemainder that repairs the disapproval cut.
  var HOUSEKEEPING_SENTENCE_RE = /(?:^|(?<=[.!?])\s*)[^.!?]*\b(?:previously filed under|provision row|no measure-level counterpart)\b[^.!?]*[.!?]\s*/gi;
  var WEIGHT_FRAME_RE = /\bWeighted\b[^.!?]*?(?:\bon purpose\s*:|\bbecause\b|:)\s*/i;
  var WEIGHT_SENTENCE_RE = /(?:^|(?<=[.!?])\s*)\s*Weighted\b[^.!?]*[.!?]\s*/gi;
  var WEIGHT_SENTENCE_START_RE = /^\s*Weighted\b/i;
  var LABEL_PREFIX_RE = /^(?:secondary|primary|note|internal)\s*:\s*/i;
  var XREF_PAREN_RE = /\s*\((?:see|cf\.?)\s[^)]*\)/gi;
  // What must never survive into public text, whatever shape it arrives in.
  var HOUSEKEEPING_LEAK_RE = /\b(?:weighted|previously filed under|provision row|recorded neutrally)\b|^(?:secondary|primary|note|internal)\s*:/i;

  function publicRationale(raw) {
    var t = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    t = t.replace(XREF_PAREN_RE, '');
    t = t.replace(HOUSEKEEPING_SENTENCE_RE, '');
    // Lift the caveat out of the weighting frame before dropping any sentence
    // that is nothing but a weighting note.
    var w = t.match(WEIGHT_FRAME_RE);
    if (w) {
      var head = t.slice(0, w.index);
      var rest = t.slice(w.index + w[0].length);
      if (rest) rest = rest.charAt(0).toUpperCase() + rest.slice(1);
      t = tidyRemainder(head) + (head && rest ? ' ' : '') + rest;
    }
    // A sentence that is nothing but a weighting note goes whole. Split with the
    // abbreviation-aware splitter rather than at every full stop: WEIGHT_SENTENCE_RE
    // read "Weighted 55, identical to S. 5's mapping, so the two vehicles score the
    // same axis at the same strength." as ending at "S." and published the orphan
    // "5's mapping, so the two vehicles…" — a citation cut in half, which is worse
    // copy than the note it was removing.
    t = splitSentences(t).filter(function (sen) {
      return !WEIGHT_SENTENCE_START_RE.test(sen);
    }).join(' ');
    t = t.replace(WEIGHT_SENTENCE_RE, '');
    t = t.replace(LABEL_PREFIX_RE, '');
    t = t.replace(/\s+/g, ' ').trim();
    if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
    return tidyRemainder(t);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // The reader's sentence, for a surface that cannot refuse
  // ══════════════════════════════════════════════════════════════════════════
  // publicRationale above is the share-card cleaner, and it works with guard 18
  // standing behind it: when a housekeeping marker survives the clean, the card
  // is REFUSED rather than published. The bill profile has no such exit. Its
  // topic ledger prints one row per mapping whatever happens, because a row that
  // quietly disappears is a rider that quietly stopped counting — so that row
  // needs a cleaner that cannot leave a leak behind, and the only cleaner that
  // can promise that is one which drops a whole sentence rather than editing
  // inside it.
  //
  // So: publicRationale first, because the caveat it lifts out of a weighting
  // frame is the part worth keeping. Then a sentence sweep over what is left. A
  // sentence about the LEDGER — what a mapping weighs, what it is ranked below,
  // which key it used to be filed under, what its flag says — is dropped whole. A
  // sentence about the WORLD is untouched, to the word. Nothing is rewritten,
  // nothing is summarised, and no sentence is composed here.
  //
  // When every sentence turns out to be bookkeeping the answer is the empty
  // string, and the caller says "no mapping rationale on file yet" — which is
  // true, and is the more useful thing for a reader to know than a note between
  // curators dressed as a finding.
  //
  // IT IS DELIBERATELY NOT FOLDED INTO publicRationale. That function decides
  // which share cards may publish at all: guard 18 reads its output, and loosening
  // it would silently turn refusals into publications. This is a second, stricter
  // pass for a surface with a different obligation, not a replacement for the
  // first one.
  //
  // A label the curators wrote to each other, wherever in the text it starts a
  // sentence. publicRationale only strips one at the very front.
  var LEDGER_LABEL_RE = /(?:^|(?<=[.!?])\s*)(?:secondary|primary|note|internal)\s*:\s*/gi;
  // The ledger's own vocabulary. Every entry can only be about this archive's
  // filing system, never about the measure. Grouped by the kind of homework it
  // names, because the list is long and each group is a different leak:
  var LEDGER_SENTENCE_RE = new RegExp([
    // How strongly a key was scored. `\bweights?\b` is the load-bearing term:
    // "Weighted 80", "low-weight", "45-weight" and the trailing "the weight is
    // what ranks the two axes" all fall to it. `w100` is the shorthand form.
    '\\bweights?\\b', '\\bweighted\\b', '\\bweighting\\b', '\\bw\\d{2,3}\\b',
    '\\bcarries (?:it )?at \\d', '\\bat full weight\\b',
    // Which key won, and how the two were ranked against each other.
    '\\branked (?:below|above|beside)\\b', '\\boutranks?\\b',
    '\\bprimary at \\d', '\\bprimary status\\b', '\\bprimary flag\\b',
    '\\bnot the flag\\b', '\\bcoded (?:a |the )?(?:primary|secondary)\\b',
    '\\b(?:the|a|its|not) (?:primary|secondary)\\b', '\\bstays secondary\\b',
    '\\bsecondaries\\b', '\\bkeys trade places\\b',
    // Filing mechanics: how the row got into the archive, or why it did not.
    '\\bmapp(?:ed|ing|ings)\\b', '\\bunmapped\\b', '\\bre-keyed\\b',
    '\\bingest(?:ed|ion)\\b', '\\btaxonomy\\b', '\\bmatched pair\\b',
    '\\bpreviously filed under\\b', '\\brecorded neutrally\\b',
    '\\bno measure-level counterpart\\b', '\\bcomparable across chambers\\b',
    '\\bmigration \\d{6,}', '\\.sql\\b', '\\bdeliberately (?:not|left)\\b',
    // The archive talking about itself: rows, keys, axes, chips, scope notes.
    '\\b(?:this|the|that) (?:row|key|axis|facet|record|corpus)\\b',
    '\\b(?:the|this) (?:axes|record\'s)\\b', '\\bits own key\\b',
    '\\benforcement axes\\b', '\\bcontrolling axis\\b',
    '\\bchip (?:reads|is)\\b', '\\bthe chip\\b', '\\bkeyword set\\b',
    '\\bkeywords? (?:name|names|set)\\b', '\\bscope note\\b',
    '\\bdeclined outright\\b', '\\bprovision row\\b',
    // Raw identifiers of any kind — issue keys, direction enums, seed filenames.
    // Reader prose about a bill never contains a snake_case token.
    '\\b[a-z]{3,}_[a-z][a-z_]*\\b'
  ].join('|'), 'i');
  function readerRationale(raw) {
    var t = publicRationale(raw);
    if (!t) return '';
    // Strip the label wherever it starts a sentence, and give the word behind it
    // the capital the label was carrying — "…a yea ends the assistance. the
    // amendment's entire operative text…" is the seam this repairs.
    t = t.replace(LEDGER_LABEL_RE, function (m, off) { return off ? ' \u0001' : '\u0001'; });
    t = t.replace(/\u0001(\s*)(\S)/g, function (m, sp, ch) { return sp + ch.toUpperCase(); });
    t = t.replace(/\u0001/g, '');
    var kept = splitSentences(t).filter(function (sen) {
      return !LEDGER_SENTENCE_RE.test(sen);
    });
    var out = tidyRemainder(kept.join(' ').replace(/\s+/g, ' ').trim());
    if (out) out = out.charAt(0).toUpperCase() + out.slice(1);
    // Belt and braces: if a phrasing nobody has seen yet slipped through the
    // sweep, publish nothing rather than publish the note.
    return LEDGER_SENTENCE_RE.test(out) ? '' : out;
  }

  // Guard 18: does any public text still read as a note between curators?
  // The sanitizer above knows the seventeen phrasings on file today. It cannot
  // know the eighteenth, so the card is refused rather than published when a
  // marker survives — including in the measure title, which no sanitizer touches.
  function blockHousekeeping(item, issueKey) {
    var m = mappingOn(item, issueKey);
    var rat = publicRationale(m && m.rationale);
    if (rat && HOUSEKEEPING_LEAK_RE.test(rat)) {
      return 'the curated rationale still carries curator housekeeping after cleanup — internal weighting or filing notes cannot print as public evidence';
    }
    if (HOUSEKEEPING_LEAK_RE.test(String((item && item.title) || ''))) {
      return 'the measure title carries curator housekeeping — internal notes cannot print as public evidence';
    }
    return '';
  }

  function blockPlainEffect(item, issueKey) {
    if (!isDisapproval(item)) return '';
    // The curators' sentence is written in ballot language — "a yea rolls back the
    // mandate" — because it exists to tell a reader which way a YEA cut. It cannot
    // say what a signature or a veto on the same resolution did, and no other
    // sentence in the record says it either. Composing one here is exactly the
    // thing guard 13 exists to prevent, so a disapproval-style measure carried by
    // anything other than a recorded vote is refused outright.
    if (item && item.kind !== 'vote') {
      return 'this is a disapproval-style resolution and the only plain-English sentence on file says what a YEA did — it cannot state what this act did, and the title alone would let a reader read it backwards';
    }
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

  // Guard 17: is the cited measure about the same subject as the stance?
  function wave1HoldPair(item, issueKey) {
    var n = item && item.number ? String(item.number) : '';
    if (!n || !issueKey) return '';
    return WAVE1_HOLD_PAIRS[n + ' :: ' + issueKey] || '';
  }

  // Guard 10: is this SAID side a stated position, rather than a vote?
  function blockStance(text) {
    var s = String(text || '').trim();
    if (!s) return 'no stated position on this issue to line the vote up against';
    if (MEASURE_CITE_RE.test(s)) return 'stated position cites a measure number — it is itself vote-derived, so the card would be circular';
    if (VOTE_VERB_RE.test(s)) return 'stated position is written as a vote — it is itself vote-derived, so the card would be circular';
    return '';
  }

  // Guard 15: is this SAID side independent of the vote the card judges it against?
  function blockDependentStance(pos, item) {
    if (!pos) return '';
    var surl = String((pos.source && pos.source.url) || '');
    var cit = citationFor(item);
    var curl = cit ? cit.url : '';
    if (surl && curl && sameAddress(surl, curl)) {
      return 'stated position is sourced to the very roll call this card cites — the two halves are one document';
    }
    // The DERIVED address is not the only way the two halves can be one document.
    // On the executive lane the citation IS the stored source, and on the
    // congressional lane a cosponsorship is sourced to the bill page a stance can
    // just as easily be sourced to — so the stored address is compared too.
    var stored = String((item && item.source && item.source.url) || '');
    if (surl && stored && sameAddress(surl, stored)) {
      return 'stated position is sourced to the very document this card cites — the two halves are one document';
    }
    if (ROLLCALL_URL_RE.test(surl)) {
      return 'stated position is sourced to a roll call — it is itself a vote, so the card would be circular';
    }
    var ev = String(pos.evidence || '');
    if (ev) {
      if (MEASURE_CITE_RE.test(ev)) return 'stated position is evidenced by a measure number — it is itself vote-derived, so the card would be circular';
      if (VOTE_VERB_RE.test(ev)) return 'stated position is evidenced by a vote — it is itself vote-derived, so the card would be circular';
    }
    var txt = String(pos.text || '');
    for (var i = 0; i < REACTION_RE.length; i++) {
      if (REACTION_RE[i].test(txt)) {
        return 'stated position reads as a reaction to one bill rather than a position on the issue — the stance word records support for or against that bill, not the goal, so the verdict can invert';
      }
    }
    return '';
  }

  // Guard 16: does the mapping this card rests on state an effect, or a framing?
  function blockFramedMapping(item, issueKey) {
    var m = mappingOn(item, issueKey);
    var r = m && m.rationale ? String(m.rationale) : '';
    if (!r) return '';
    if (RATIONALE_NEUTRAL_RE.test(r)) {
      return 'the curated rationale for this mapping is recorded neutrally — it notes how a side characterised the measure rather than what the measure does, so it cannot carry a verdict';
    }
    if (RATIONALE_FRAMING_RE.test(r)) {
      return "the curated rationale for this mapping leads with one side's framing rather than the measure's own effect, so the card would print an argument as a finding";
    }
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
    omnibus:     { key: 'omnibus',     cls: 'v-omnibus',     ico: '⇅', label: 'One Vote · Two Outcomes',       rank: 4 },
    // The split record. Not a softer contradiction and not a hedge: it is the
    // verdict the engine already reached for this member on this issue, and the
    // card exists so that verdict can leave the app in the same shape it has on
    // the profile — both sides, counted, with a named vote cited on each.
    mixed:       { key: 'mixed',       cls: 'v-mixed',       ico: '⇄', label: 'Split Record · Voted Both Ways', rank: 3 }
  };

  // ── The same four verdicts, said in the language of an ACT ────────────────
  // "Says One Thing · Voted Another" over a signature, an executive order or a
  // cosponsorship is a false statement about the mechanism even when the verdict
  // itself is right, and the verdict stamp is the largest text on the card — it is
  // the one line a scrolling reader takes away. So a card built on a non-vote
  // instrument gets a stamp that says what actually happened.
  //
  // The KEY is unchanged, deliberately: the stamp is what a reader sees, and the
  // key is what every other surface (impact, colour class, ranking, the public
  // audit) reads. Changing the wording must not fork the verdict.
  var ACT_VERDICT_LABELS = {
    contradicts: 'Says One Thing · Did Another',
    consistent:  'Action Matched The Words',
    omnibus:     'One Action · Two Outcomes',
    mixed:       'Split Record · Acted Both Ways'
  };
  function actVerdict(v) {
    var label = v && ACT_VERDICT_LABELS[v.key];
    if (!label) return v;
    return { key: v.key, cls: v.cls, ico: v.ico, label: label, rank: v.rank };
  }

  // "H.J.Res. 78 · On Passage · Voted Yea" — bill, question, position, in the same
  // order and the same words the profile's Official Record proof line uses. Built
  // from PDXConsistency.proof.proofText when that module is loaded so the two can
  // never drift; the local fallback prints the identical string.
  //
  // A NON-VOTE instrument is named from the table in this file instead. The row
  // face's phrase for one is assembled from exec-record.js's verb list, which
  // degrades to a bare title-cased slug ("Issued") when that module has not
  // loaded — acceptable on a row sitting inside the app beside its own source,
  // and not acceptable on an image whose whole job is to say what kind of act it
  // is showing. INSTRUMENTS ships with this file and cannot be half-present.
  function proofLine(item) {
    var instr = instrumentOf(item);
    if (instr && instr.key !== 'vote') {
      return [String((item && (item.number || item.title)) || '').trim(), instr.label]
        .filter(Boolean).join(' · ');
    }
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
      // "Voted <x>" is printed only for something a member can actually vote —
      // never off an actionType that happens to be sitting in `position`.
      if (item.position && item.kind !== 'position') parts.push('Voted ' + titleCase(item.position));
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
    var rat = publicRationale(mapping && mapping.rationale);
    var instr = instrumentOf(item);
    // Slot 0 is the clause a reader cannot reconstruct from anything else on the
    // card. On a floor vote that is the disapproval effect; on every other
    // instrument it is what kind of act this was — the sentence that keeps a
    // cosponsorship from being read as a deciding vote. The two never collide:
    // a disapproval measure carried by a non-vote instrument is refused by
    // guard 13 rather than published with either sentence.
    if (instr && instr.key !== 'vote') {
      if (instr.note) parts.push(instr.note);
    } else if (isDisapproval(item)) {
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
    if (item.result) tail.push(resultLabel(item.result));
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
    // Guard 5 has already refused an instrument with no honest label, and guard 12
    // anything this cannot resolve, so a built card always names its act and cites
    // a page a stranger can open.
    var instr = instrumentOf(item) || INSTRUMENTS.vote;
    var isVote = instr.key === 'vote';
    var citation = citationFor(item) || { url: '', print: '', label: 'Official record' };
    // ── The footer address, when the document's own address will not fit ──────
    // A derived roll-call citation is always short. A stored document address
    // frequently is not: most Federal Register documents and most court filings
    // run past the printable width of the footer line, and 118 of the ones on file
    // do. The three ways out of that are to shorten the URL (a URL a reader cannot
    // retype is not a citation), to refuse the card (the receipt is real and the
    // reader loses it over typography), or to print the PolitiDex record page —
    // which cites the document, by name and by address, on the page it opens.
    // That is what the split card already does when it has two chamber addresses
    // and no single page that is the record of both, so it is what happens here.
    // The document's own address is unchanged in `source`, so the pasted caption
    // still carries the direct link at full length.
    var verify = citation.print;
    if (!verify || verify.length > VERIFY_MAX) {
      verify = printableUrl(recordPageUrl(pid, issueKey));
      if (!verify || verify.length > VERIFY_MAX) return null;   // fail closed
    }
    if (!isVote) verdict = actVerdict(verdict);

    return {
      // identity
      pid: pid, name: name, sub: sub, party: d ? partyChip(d.party) : null,
      photo: photo, hasOffice: !!(d && (d.office || d.district)),
      // issue
      issueKey: issueKey, issue: issueMeta(issueKey),
      // SAID — the stated position, verbatim.
      //
      // NULL, not empty, when there is no stated position. The record-direction
      // card below is built for exactly the rows where none exists, and an empty
      // SAID block is not the same object as an absent one: the renderer already
      // guards the whole block on `r.said`, so null omits it cleanly, while a
      // present-but-blank block would print a label and an empty quote. Every
      // other card in this file passes a real stance and is unaffected.
      said: stance
        ? { text: stance.text || stance.topic || '', word: stanceWord(stance.stance) }
        : null,
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
      saidLabel: stance ? 'THEIR STATED POSITION' : '',
      saidNote: stance
        ? ('Stated position is undated — this card does not claim it came before the ' +
           (isVote ? 'vote' : 'act') + '.')
        : '',
      // DID — bill, question, position, date
      headline: proofLine(item),
      // WHAT KIND OF ACT — the label, the strength and the sentence that keeps a
      // supporting act from being read as a deciding one. Carried on the card
      // rather than re-derived downstream so the public gate, the renderer and any
      // future surface all read the same answer.
      instrument: { key: instr.key, label: instr.label, strength: instr.strength, note: instr.note },
      // The short form a post has room for ("Cosponsored S. 331"). Empty on a
      // floor vote, whose headline already states the direction in full and whose
      // short form the renderer has always built for itself.
      didLine: isVote ? '' : didPhrase(instr, item.number),
      // What the caption calls fact slot 0. On a vote that slot is the disapproval
      // sentence and the label says so; on an act it is the instrument note.
      effectLabel: isVote ? '' : 'What kind of act this is',
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
      verifyUrl: verify,
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
  // THE ITEM CHAIN  ·  every guard that judges ONE cited vote
  // ──────────────────────────────────────────────────────────────────────────
  // Pulled out of the candidate loop so there is exactly one list of them. A
  // one-sided card cites one vote and runs this once; a split card cites two and
  // runs it twice, on each. Written as one function rather than copied so a
  // nineteenth guard cannot be added to one shape of card and forgotten on the
  // other — the split card is harder to build than either single-sided card, and
  // it stays that way by construction.
  //
  // What is NOT here: the checks that judge the ROW rather than the vote — a
  // stated position exists (and is not itself a vote), the net verdict is the one
  // the card claims, the issue key is not held out of wave 1. Those are asked
  // once per row by the callers below.
  // ══════════════════════════════════════════════════════════════════════════
  function itemBlock(pid, issueKey, pos, item, records) {
    return blockIssue(pid, issueKey, pos && pos.text, item) ||
      blockDependentStance(pos, item) ||
      blockRecord(item) ||
      blockCitation(item) ||
      blockUnverifiedCitation(item) ||
      blockPlainEffect(item, issueKey) ||
      blockFramedMapping(item, issueKey) ||
      blockHousekeeping(item, issueKey) ||
      blockDuplicateIdentity(records, issueKey, item.number) ||
      wave1HoldPair(item, issueKey);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BOTH-SIDES EVIDENCE  ·  what a split row is allowed to cite
  // ──────────────────────────────────────────────────────────────────────────
  // A split card makes one claim — "the record runs both ways on this issue" —
  // and that claim is only as good as the two votes it puts under it. So each
  // side needs a vote of its own that passes the whole item chain above. If
  // either side has none, there is no card: a "split" card citing one side and
  // asserting the other is a one-sided card wearing a fairer name.
  //
  // WHICH vote. The engine's own top item for the side is asked for first — the
  // same one the profile row cites, so the card and the row agree. When that item
  // is refused by a guard (most often guard 1: the strongest weight on a side is
  // a confirmation vote, which is a policy proxy and cannot carry a policy claim
  // off-app), the scan steps down to the next-strongest item on that side and
  // asks again. That is not a loosened guard — every candidate is put through the
  // identical chain, and an item that fails is never cited. It is the difference
  // between "the strongest item happens to be uncitable, so nothing travels" and
  // "the strongest CITABLE item travels", and the second is what the row already
  // shows a reader who opens it.
  //
  // The step-down re-asks the shared engine rather than ranking items here: drop
  // the refused item from the list, re-run _issueRecordSummary, read its new top
  // for the side. Same ranking rule, same judging, no second implementation of
  // either. The lists are per-issue and short, so the repeated summarise costs
  // nothing worth optimising away.
  var SIDE_WORD = { with: 'with-side', against: 'against-side' };
  function strongestCitable(pid, issueKey, pos, records, issueItems, stance, side) {
    var key = side === 'with' ? 'topConsistent' : 'topContradiction';
    var pool = issueItems.slice();
    var firstRefusal = '';
    for (var guard = 0; guard <= issueItems.length; guard++) {
      var s = window._issueRecordSummary(issueKey, stance, pool);
      var item = s && s[key];
      if (!item) break;
      var why = itemBlock(pid, issueKey, pos, item, records);
      if (!why) return { item: item, blocked: '', steppedDown: guard > 0 };
      if (!firstRefusal) firstRefusal = why;
      pool = pool.filter(function (x) { return x !== item; });
    }
    return {
      item: null, steppedDown: false,
      blocked: 'the ' + SIDE_WORD[side] + ' example: ' +
        (firstRefusal || 'no vote on this side of the record to cite')
    };
  }

  // The face of one cited item inside a split card: what it was, what it did, when,
  // and the address a stranger reads it at. Every field is one the single-sided
  // card already prints — nothing new is asserted about either item, they are
  // simply both on the same card.
  //
  // `head`, `lead` and `tail` are the three places the two sides get LABELLED —
  // the image, the pasted caption and the post — and all three used to say
  // "VOTED". A side carrying a signature, an executive order or a cosponsorship
  // is not a vote, so it says what it is instead. Only the side that is not a
  // vote is relabelled, so a split holding one roll call and one signature reads
  // "VOTED WITH THEIR POSITION" over the one and "ACTED AGAINST IT" over the
  // other — which is exactly what happened. Left unset on a vote so every
  // renderer keeps its own wording as the default and vote cards are untouched.
  function sideFace(item, issueKey, side) {
    var mapping = mappingOn(item, issueKey);
    var parts = supportingParts(item, mapping);
    var instr = instrumentOf(item) || INSTRUMENTS.vote;
    var citation = citationFor(item) || { url: '', print: '', label: 'Official record' };
    var face = {
      number: item.number || '',
      proof: proofLine(item),
      effect: parts[0] || '',
      title: parts[1] || '',
      date: dayOf(item.date),
      url: citation.url,
      verify: citation.print,
      label: citation.label,
      instrument: { key: instr.key, label: instr.label, strength: instr.strength, note: instr.note }
    };
    if (instr.key !== 'vote') {
      face.head = side === 'with' ? 'ACTED IN LINE WITH THEIR POSITION' : 'ACTED AGAINST IT';
      face.lead = side === 'with' ? 'Acted in line with their position' : 'Acted against it';
      face.tail = side === 'with' ? 'Acted with' : 'Acted against';
    }
    return face;
  }

  // "2025-07-03" when both votes fall on one day, "2024-12-21 – 2025-07-03" when
  // they do not — the same ISO day every other card's footer prints. The footer
  // carries ONE date line, and a split card that prints one of its two vote dates
  // there is quietly misattributing the other.
  function dateSpan(a, b) {
    var d1 = dayOf(a && a.date), d2 = dayOf(b && b.date);
    if (!d1) return d2 || '';
    if (!d2 || d1 === d2) return d1;
    var first = String((a && a.date) || '') <= String((b && b.date) || '');
    return (first ? d1 : d2) + ' – ' + (first ? d2 : d1);
  }

  // The page that holds BOTH votes. A one-sided card's footer address is the
  // chamber's own record of the one vote it cites; a split card cites two, and
  // there is no government page that is the record of both. So the footer points
  // at the issue record this card is a picture of — which cites each vote at its
  // own chamber address — and each of those addresses is printed on the card
  // beside the vote it belongs to. Nothing is hidden behind the link that is not
  // also on the image.
  function recordPageUrl(pid, issueKey) {
    try {
      if (window.PDXShareLinks && typeof window.PDXShareLinks.record === 'function') {
        var u = window.PDXShareLinks.record(pid, issueKey);
        if (u) return u;
      }
    } catch (e) {}
    return 'https://politidex.fyi/#' + SHARE_HASH + '=' +
      encodeURIComponent(pid) + '~' + encodeURIComponent(issueKey);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATE ENUMERATION
  // ──────────────────────────────────────────────────────────────────────────
  // For one member: every (issue, cited vote) pair the engine already ranks,
  // annotated with the guard verdict. Returns candidates in BOTH states so
  // audit() can report the exclusions rather than only the survivors.
  //
  // Three wants per issue, not two. `contradicts` and `consistent` each cite the
  // engine's top item on their side; `mixed` cites one on EACH side and is only
  // ever offered on a row whose net verdict is already mixed — guard 9 refuses
  // all three the moment the claim and the row disagree.
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
            itemBlock(pid, issueKey, pos, item, records) ||
            stableVerdict(summary, want) ||
            wave1Hold(issueKey);
          out.push(cand);
        });

      // ── The split card ────────────────────────────────────────────────────
      // Offered only where the engine already says the record runs both ways.
      // It asks the SAME row-level questions the two single-sided cards ask, and
      // then asks the item chain twice — once per side — so it can only exist
      // where two separate votes each clear everything a single-sided card's one
      // vote has to clear. Nothing here relaxes a guard; the extra evidence is
      // the extra requirement.
      if (summary.netVerdict === 'mixed') {
        var withSide = strongestCitable(pid, issueKey, pos, records, byIssue[issueKey], stance, 'with');
        var againstSide = strongestCitable(pid, issueKey, pos, records, byIssue[issueKey], stance, 'against');
        var split = {
          pid: pid, issueKey: issueKey, want: 'mixed',
          // `item` is the against-side vote so every downstream reader that
          // expects a cited item on a candidate keeps working; `sides` is what
          // the card is actually built from, and both are required.
          item: againstSide.item || withSide.item || null,
          sides: { with: withSide.item, against: againstSide.item },
          // Whether the COUNTS this card prints cover anything that is not a
          // floor vote. The counts are the engine's, over the whole judged list
          // for this issue — so "voted with their position 3 times" is a false
          // sentence the moment one of those three is a signature or a
          // cosponsorship, even when both cited examples happen to be roll
          // calls. Read off the judged list rather than off the two examples.
          hasActs: byIssue[issueKey].some(function (it) {
            var ins = instrumentOf(it);
            return !!ins && ins.key !== 'vote';
          }),
          // And whether any of them is a SUPPORTING act, which is the stricter
          // question: a card whose counts include a cosponsorship may not be
          // worded as though every item under it were a deciding one.
          hasSupporting: byIssue[issueKey].some(function (it) {
            var ins = instrumentOf(it);
            return !!ins && ins.strength === 'supporting';
          }),
          steppedDown: !!(withSide.steppedDown || againstSide.steppedDown),
          summary: summary, stance: pos || null, blocked: ''
        };
        split.blocked =
          blockIssue(pid, issueKey, pos && pos.text, split.item || {}) ||
          (pos ? '' : 'no stated position on this issue to line the votes up against') ||
          blockStance(pos && pos.text) ||
          stableVerdict(summary, 'mixed') ||
          wave1Hold(issueKey) ||
          withSide.blocked ||
          againstSide.blocked;
        out.push(split);
      }
    });

    // Strongest first: decisiveness of the issue verdict, then the weight of the
    // cited vote, then recency. Contradictions and consistencies are ranked in
    // the same units so neither is structurally favoured. A split candidate that
    // could not find a citable vote on either side is already blocked and only
    // reaches this loop so audit() can report it, so `item` may be null here.
    out.forEach(function (c) {
      var mapping = c.item ? mappingOn(c.item, c.issueKey) : null;
      var w = (mapping && typeof mapping.weight === 'number') ? mapping.weight : 100;
      var margin = Math.abs(c.summary.contradictScore - c.summary.consistentScore);
      var recency = c.item ? Math.max(0, yearOf(c.item.date) - 2000) : 0;
      c.strength = w + margin + recency + (c.summary.total > 1 ? 25 : 0);
      // ── Deciding acts outrank supporting ones, always ─────────────────────
      // Only one card is built per (member, issue) — the strongest candidate
      // takes the slot — so this ranking decides which receipt a reader is shown
      // and which one travels. A cosponsorship that outranked a floor vote on
      // the same issue would be exactly the silent upgrade the walls forbid: the
      // soft act would become the member's record on that issue in every surface
      // that shows one. So the two strengths are ranked in separate bands rather
      // than on one scale, and a supporting act leads only where there is no
      // deciding act to lead with. Nothing is dropped — the demoted candidate is
      // still eligible, still audited, still shareable from its own row.
      var ins = c.item ? instrumentOf(c.item) : null;
      c.deciding = !(ins && ins.strength === 'supporting');
      // A split card is ranked in exactly those units too — no bonus for being
      // the new shape. On a mixed row the two single-sided candidates are refused
      // by guard 9 anyway, so the split card is the only one that can be built
      // there; letting it also outrank a member's other issues would be this file
      // putting a thumb on which finding leads, which is not its job.
    });
    out.sort(function (a, b) {
      // The band first, and it is a band rather than a penalty on purpose: a
      // large enough margin on a soft act must not be able to buy its way past a
      // roll call, which any subtracted constant would eventually allow.
      if (a.deciding !== b.deciding) return a.deciding ? -1 : 1;
      return b.strength - a.strength;
    });
    return out;
  }

  function toCard(cand) {
    if (!cand || cand.blocked) return null;
    var card = cand.want === 'mixed'
      ? splitCard(cand)
      : baseCard(cand.pid, cand.item, cand.issueKey, cand.stance, VERDICTS[cand.want]);
    if (!card) return null;
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
  // THE SPLIT CARD  ·  "voted with it N times, against it M times"
  // ──────────────────────────────────────────────────────────────────────────
  // Built on the same baseCard every other card is built on — same identity,
  // same issue chip, same stated position, same undated-stance disclosure, same
  // method line — and then given the three things a split record needs and a
  // one-sided card does not:
  //
  //   headline   the finding, in the form a reader can repeat: on this issue,
  //              this member voted with their stated position N times and
  //              against it M times. A sentence, not a score.
  //   sides      one named, dated, sourced vote on EACH side, each with its own
  //              chamber address printed beside it.
  //   footer     the issue record that holds both votes, because no single
  //              government page is the record of two different roll calls.
  //
  // WHAT IT MUST NOT DO, and how that is enforced here rather than hoped for:
  //
  //   · No percentage. The counts are printed as counts. A split rendered as
  //     "67% with / 33% against" would read as a second PolitiDex score sitting
  //     next to Direction Match, and there is only one score.
  //   · No new arithmetic. N and M are summary.consistent and summary.contradicts
  //     — the engine's own counts, the same two numbers the profile row shows.
  //     They are not recounted, re-weighted, or filtered down to the votes this
  //     card happens to cite. That is deliberate and it is why the card says
  //     outright that the counts cover the whole judged record while the two
  //     examples are the strongest CITABLE vote on each side: some judged items
  //     (a confirmation vote mapped as a policy proxy, most often) count on the
  //     row and still cannot carry a policy claim off-app. The link goes to the
  //     row, where every item is listed with its own provenance.
  //   · No public-lane material. `sides` is assembled from vr_* record items
  //     only, exactly like every other card in this file.
  // ══════════════════════════════════════════════════════════════════════════
  function timesPhrase(n) { return n + (n === 1 ? ' time' : ' times'); }

  function splitCard(cand) {
    var withItem = cand.sides && cand.sides.with;
    var againstItem = cand.sides && cand.sides.against;
    if (!withItem || !againstItem) return null;   // fail closed: no one-sided "split"

    var card = baseCard(cand.pid, againstItem, cand.issueKey, cand.stance, VERDICTS.mixed);
    if (!card) return null;   // baseCard fails closed on an address it cannot print
    var issueName = (card.issue && card.issue.label) || 'this issue';

    // ── Vote language, or act language, for the whole card ────────────────────
    // Either cited example being something other than a roll call is enough, and
    // so is a non-vote sitting anywhere in the judged list the COUNTS are taken
    // from: this card's headline is a sentence about N + M items, not about the
    // two it happens to show. When any of them is a signature or a cosponsorship,
    // "voted" is the wrong verb for the sentence and the stamp goes with it.
    var withInstr = instrumentOf(withItem) || INSTRUMENTS.vote;
    var againstInstr = instrumentOf(againstItem) || INSTRUMENTS.vote;
    var acts = withInstr.key !== 'vote' || againstInstr.key !== 'vote' || !!cand.hasActs;

    card.headline = 'On ' + issueName + ', ' + card.name + ' ' +
      (acts ? 'acted in line with their stated position ' : 'voted with their stated position ') +
      timesPhrase(cand.summary.consistent) + ' and against it ' +
      timesPhrase(cand.summary.contradicts) + '.';
    card.verdict = acts ? actVerdict(VERDICTS.mixed) : VERDICTS.mixed;

    card.sides = {
      counts: { with: cand.summary.consistent, against: cand.summary.contradicts },
      with: sideFace(withItem, cand.issueKey, 'with'),
      against: sideFace(againstItem, cand.issueKey, 'against')
    };
    // Each side prints its OWN address on the image, so neither can fall back to
    // the record page the way a single-sided card does — both would then print
    // the same line. A document address too long to set is refused outright.
    if (!card.sides.with.verify || card.sides.with.verify.length > VERIFY_MAX) return null;
    if (!card.sides.against.verify || card.sides.against.verify.length > VERIFY_MAX) return null;

    // A split card is about two items, so the single-item act line baseCard left
    // here would name one of them and drop the other. Replaced with the counted
    // form, or cleared so the post keeps the vote wording it has always used.
    card.didLine = acts
      ? ('Acted in line with their position ' + cand.summary.consistent + '× (' +
         (withItem.number || '') + ') and against it ' + cand.summary.contradicts + '× (' +
         (againstItem.number || '') + ')')
      : '';
    card.effectLabel = '';
    // What KIND of act this card is about is now a two-part answer. The strength
    // is the weaker of everything the counts cover: a card that counts a
    // cosponsorship alongside a roll call may not be worded as though every item
    // on it were a deciding act. The per-side instrument, which is the precise
    // answer, is on each side face.
    var soft = cand.hasSupporting ||
      withInstr.strength === 'supporting' || againstInstr.strength === 'supporting';
    card.instrument = acts
      ? { key: 'mixed', label: 'Recorded votes and other formal acts',
          strength: soft ? 'supporting' : 'deciding',
          note: 'This card counts recorded votes together with other formal acts on the record. ' +
                'Each example below says which it is.' }
      : { key: 'vote', label: INSTRUMENTS.vote.label, strength: 'deciding', note: '' };

    // baseCard filled these from the against-side vote alone. On a split card
    // that would print one measure's title under a headline about two, so the
    // fact block carries the one thing the two-sided evidence needs said instead.
    card.factParts = [];
    // Short enough to print on ONE line inside the card's content width at the
    // size the renderer reserves for it — an ellipsized caveat is a caveat that
    // did not travel. The caption carries the same point at full length.
    card.facts = acts
      ? 'Counts cover every judged action; each example is the strongest we can cite.'
      : 'Counts cover every judged vote; each example is the strongest we can cite.';
    card.countsNote = 'Counts cover every judged ' + (acts ? 'action' : 'vote') +
      ' on this issue; each example above is the strongest ' + (acts ? 'one' : 'vote') +
      ' on its side that can be cited on its own.';

    card.impact = 'split';
    card.recordLabel = 'AND THE RECORD SHOWS BOTH';
    card.date = dateSpan(withItem, againstItem);
    card.source = {
      url: recordPageUrl(cand.pid, cand.issueKey),
      label: 'Official record — both ' + (acts ? 'actions' : 'votes')
    };
    card.verifyUrl = printableUrl(card.source.url);
    // Same rule guard 12 applies to a chamber citation: an address that will not
    // fit the footer line un-shortened is not an address a reader can follow, and
    // a "…" in a URL is quietly wrong. Fail closed rather than print one.
    if (!card.verifyUrl || card.verifyUrl.length > VERIFY_MAX) return null;
    // Both measures, so the public gate can re-check the wave-1 pair holds
    // against each of them rather than only against the one baseCard named.
    card.measureNumbers = [withItem.number || '', againstItem.number || ''].filter(Boolean);
    card.sourceStored = [(withItem.source && withItem.source.url) || '',
                         (againstItem.source && againstItem.source.url) || ''].filter(Boolean).join(' | ');
    return card;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE RECORD-DIRECTION CARD  ·  what the record did, where nothing was said
  // ──────────────────────────────────────────────────────────────────────────
  // Every card above this line is a claim about a member's WORDS against their
  // record. That claim needs a stated position, and on most (member, issue)
  // pairs there is none — so the strongest thing PolitiDex knows about those
  // rows, the direction of the formal record itself, has never been able to
  // leave the app. This is the shape that lets it, and the whole design problem
  // is keeping it from quietly becoming one of the things above it.
  //
  // WHAT IT CLAIMS. One sentence, made of counts the row already shows:
  //   "On <issue>, <Name> has 14 recorded votes — 11 advanced it, 3 cut
  //    against it."
  //   "On <issue>, <Name>'s recorded votes all advanced it (5)."
  //   "On <issue>, <Name>'s record ran both ways — 20 recorded votes: 13 cut
  //    against it, 7 advanced it."
  // That is a description of a record. It is not a stance, not an inferred
  // stance, and not a score.
  //
  // THE THIRD SHAPE is the one that names no direction, and it is here because
  // the alternative was worse. A row whose record ran both ways used to print
  // five words — "they ran both ways" — over as many as twenty judged votes,
  // and could not leave the app at all, because "does this record characterise?"
  // was being asked to answer two different questions at once: may we say what
  // the record DID, and may we say HOW MUCH of it went each way. A split can
  // never answer the first. It answers the second perfectly well once it is
  // deep enough, so the index publishes the two permissions separately
  // (`characterised` and `counted`) and this card reads the second. Nothing
  // about the split shape names a lead, ranks the sides, or implies that the
  // larger number is the member's position.
  //
  // WHAT IT MUST NOT DO, and where each wall is:
  //   · No stance, inferred or otherwise. The card is only ever built where the
  //     member's position map holds NOTHING for the issue, `said` is null, and
  //     no copy on it uses "supports", "opposes" or any said-vs-did token —
  //     enforced on the finished text by rdPublicBlock() below.
  //   · No second score. No percentage, no proportion, no ratio: the counts are
  //     printed as counts. Also enforced on the finished text.
  //   · No effect on Direction Match. Nothing here writes; the eligibility test
  //     is a READ of the same pure index the row uses, and this feed is reached
  //     through its own functions — candidates(), cardsFor(), audit() and the
  //     public reads over them are untouched, so said-vs-did card volume cannot
  //     move because this file grew.
  //   · No loosened guards. Eligibility is `idx.counted === true` from
  //     window._recordDirectionIndex — which is the depth rule, the dominance
  //     rule, the split depth and both-sides-material rules, the primary-mapping
  //     rule, the member coverage floor and the no-pole / *_balance
  //     suppressions, all of them, in one flag and in one implementation. The
  //     split shape adds thresholds to that index; it removes none, and it adds
  //     none here. Every cited example goes through the identical itemBlock()
  //     chain the omnibus split card's two examples go through, with the stance
  //     argument passed as null — which that chain already handles, because
  //     guard 10 is asked by the CALLERS and never by the chain.
  // ══════════════════════════════════════════════════════════════════════════
  var RD_ORIGIN = 'record_direction';

  // The stamp. Deliberately not in VERDICTS and deliberately sharing no key with
  // it: a reader must not be able to confuse this with "Vote Matched The Words",
  // and a downstream surface reading `verdict.key` must not be able to either.
  // One label for votes and acts alike, because the sentence it heads is already
  // written in whichever noun the record earns.
  var RD_VERDICT = {
    key: 'record_direction', cls: 'v-record-direction', ico: '🏛',
    label: 'What The Record Did', rank: 1
  };
  // A record that ran both ways did not do one thing, so the stamp does not say
  // it did. Same key, same accent, same lane — only the sentence on the stamp
  // changes, because the sentence is the part that would otherwise be false.
  var RD_SPLIT_LABEL = 'The Record Ran Both Ways';
  function rdVerdict(split) {
    return { key: RD_VERDICT.key, cls: RD_VERDICT.cls, ico: RD_VERDICT.ico,
             label: split ? RD_SPLIT_LABEL : RD_VERDICT.label, rank: RD_VERDICT.rank };
  }

  // THE DISCLOSURE, as a constant rather than a sentence written at the call
  // site. It is the one line on the card that has to survive to the pixels, and
  // it is checked below by EQUALITY, not by a denylist: the stance-vocabulary
  // tripwire is a blunt instrument that would have to be taught an exception for
  // this sentence's own "not a stated stance", and an exception in a denylist is
  // a hole. Fixed text compared exactly is stricter than any regex over it —
  // nothing can be added to this line, softened in it, or dropped from it.
  var RD_NOTE = 'No stated position on file — this is what the record itself did, ' +
    'not a stated stance and not a score.';

  // Which way ONE item cut on this issue, from the same engine function the
  // index counts with — never a second reading of supportMeaning. null when the
  // item carries no direction (present / not voting), which is exactly what the
  // index skips.
  function rdSide(item, issueKey) {
    var m = mappingOn(item, issueKey);
    if (!m || typeof window._voteEffectiveSupport !== 'function') return null;
    var eff = window._voteEffectiveSupport(item, m.supportMeaning);
    if (eff === null || typeof eff === 'undefined') return null;
    return eff ? 'advances' : 'opposes';
  }

  // The strongest CITABLE item on one side, by the same step-down the split card
  // uses: rank, ask the whole item chain, and on a refusal move to the next one
  // rather than either loosening the chain or losing the card.
  //   RANKED ON EVIDENCE STRENGTH FIRST, AND ON THE FLAG ONLY TO BREAK A TIE. The
  // first key used to be `isPrimary`, which meant a procedural motion-to-table on a
  // flagged mapping outranked a recorded vote on final passage — the flag deciding
  // what got QUOTED, ahead of every property that actually makes one vote better
  // evidence than another. The order is now:
  //     1. not procedural. Procedural votes count at a quarter weight in the index
  //        and on some questions (recommit, table) a Yea is a vote against the bill;
  //        a reader shown one as "what the record did" has been handed the weakest
  //        thing in the pool.
  //     2. not an amendment. A vote on the measure itself is a plainer illustration
  //        of a direction than a vote on one of its amendments.
  //     3. curated weight, descending — the explicit statement of how much this
  //        mapping bears on the issue.
  //     4. `isPrimary`, as a tiebreak between items that are otherwise equally good
  //        evidence, because an issue the measure was actually about does illustrate
  //        a direction better than an incidental mapping.
  //     5. recency.
  //   THIS REMAINS THE INTERNAL ANTI-NOISE USE OF `isPrimary`, AND IT IS THE WHOLE OF
  // IT HERE. It picks WHICH ONE of several already-eligible items gets quoted as an
  // example; it hides no row, demotes no topic and reaches no Big Picture surface.
  // The citizen-facing instrument faces — bill-detail.js, exec-record-ui.js, the
  // record cards in voting-record.js, the library shelf and the search index —
  // ignore the flag as a visibility rule entirely. Any future use of it beyond
  // example selection is an engine decision, not a rendering one.
  var RD_SIDE_WORD = { advances: 'advanced-it', opposes: 'cut-against-it' };
  function rdStrongest(pid, issueKey, items, records, want) {
    var pool = items.filter(function (it) { return rdSide(it, issueKey) === want; });
    pool.sort(function (a, b) {
      var ma = mappingOn(a, issueKey) || {}, mb = mappingOn(b, issueKey) || {};
      if (!!a.isProcedural !== !!b.isProcedural) return a.isProcedural ? 1 : -1;
      if (!!a.isAmendment !== !!b.isAmendment) return a.isAmendment ? 1 : -1;
      var wa = (typeof ma.weight === 'number') ? ma.weight : 100;
      var wb = (typeof mb.weight === 'number') ? mb.weight : 100;
      if (wa !== wb) return wb - wa;
      if (!!ma.isPrimary !== !!mb.isPrimary) return ma.isPrimary ? -1 : 1;
      return String(b.date || '') < String(a.date || '') ? -1
           : String(b.date || '') > String(a.date || '') ? 1 : 0;
    });
    var firstRefusal = '';
    for (var i = 0; i < pool.length; i++) {
      var why = itemBlock(pid, issueKey, null, pool[i], records);
      if (!why) return { item: pool[i], blocked: '', steppedDown: i > 0 };
      if (!firstRefusal) firstRefusal = why;
    }
    return {
      item: null, steppedDown: false,
      blocked: 'the ' + RD_SIDE_WORD[want] + ' example: ' +
        (firstRefusal || 'nothing on this side of the record can be cited on its own')
    };
  }

  // Why this row may not print its counts, in the index's own words. The index
  // is the ONLY authority on this — there is no second threshold table here, so
  // there is nothing to drift.
  //   The flag asked for is `counted`, not `characterised`. Those are two
  // different permissions and the index publishes both: a deep split has no
  // direction to characterise and two real counts to state, and a card that
  // reported the second is not making the first claim. Every row that clears
  // `characterised` also clears `counted`, so nothing that shipped before this
  // stops shipping.
  function rdBlockIndex(idx) {
    if (!idx) return 'the record-direction index is unavailable';
    if (!idx.counted) {
      return 'the record does not characterise on this row: ' +
        String(idx.label || idx.token).toLowerCase() +
        (idx.suppressed ? ' (' + idx.suppressed + ')' : '');
    }
    return '';
  }

  // ── Candidate enumeration for this feed only ──────────────────────────────
  // Same grouping as candidates() above, a different question asked of it.
  // Returns candidates in BOTH states so the audit can report the exclusions.
  function recordDirectionCandidates(pid) {
    pid = canonPid(pid);
    var records = recordsFor(pid);
    if (!records || !records.length) return [];
    if (typeof window._recordDirectionIndex !== 'function') return [];

    var counts = (typeof window._pdxRecordMappedCounts === 'function')
      ? window._pdxRecordMappedCounts(pid) : null;
    var held = counts ? counts.votes : null;   // unknown fails the coverage floor
    var pm = positionMapFor(pid);

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
      // The same items the row reads, in the same order, when the adapter is
      // loaded — so the card and the profile row can never be built from two
      // different lists. The local grouping is the fallback and holds the same
      // set; the index's counts are order-independent either way.
      var items = byIssue[issueKey];
      try {
        if (typeof window._pdxRecordIssueItems === 'function') {
          items = window._pdxRecordIssueItems(pid, issueKey) || items;
        }
      } catch (e) {}

      var meta = issueMeta(issueKey);
      var idx = window._recordDirectionIndex(issueKey, items, {
        memberRecordCount: held,
        label: (meta && meta.label) || ''
      });

      // Whether the judged pool holds anything that is not a floor vote. The
      // counts this card prints cover every judged item, so "recorded votes" is
      // a false noun the moment one of them is a signature or a cosponsorship —
      // read off the judged list, never off the one or two examples shown.
      var acts = false, soft = false;
      items.forEach(function (it) {
        if (!mappingOn(it, issueKey)) return;
        if (rdSide(it, issueKey) === null) return;
        var ins = instrumentOf(it);
        if (!ins) { acts = true; soft = true; return; }
        if (ins.key !== 'vote') acts = true;
        if (ins.strength === 'supporting') soft = true;
      });

      // WHICH SIDE THE CARD FETCHES FIRST. A characterised row already knows —
      // `lead` names the heavier side by weight. A split has no lead and must
      // not be handed one, so the order falls back to the larger raw count
      // (ties to advances). It decides which example is looked up first and
      // nothing else: it is never printed, never stored on the card as a
      // direction, and both sides are asked for either way.
      var leadSide = idx.lead || (idx.advances >= idx.opposes ? 'advances' : 'opposes');
      var otherSide = leadSide === 'advances' ? 'opposes' : 'advances';
      var lead = rdStrongest(pid, issueKey, items, records, leadSide);
      // Only asked for where the record actually ran both ways. "for splits, one
      // on each side if available" — so a minority side with nothing citable
      // costs the card its second example, not its existence: the counts are the
      // finding and they are unchanged either way.
      var other = (idx.advances && idx.opposes)
        ? rdStrongest(pid, issueKey, items, records, otherSide)
        : { item: null, blocked: '', steppedDown: false };

      var cand = {
        pid: pid, issueKey: issueKey, want: 'record_direction',
        idx: idx, items: items, acts: acts, soft: soft,
        lead: lead, other: other, leadSide: leadSide,
        // The item every downstream reader of a candidate expects.
        item: lead.item || null,
        steppedDown: !!(lead.steppedDown || other.steppedDown),
        blocked: ''
      };
      cand.blocked =
        // First, and it is the whole point of this feed: a row with a stated
        // position belongs to Direction Match and to the cards above. This one
        // does not go near it.
        (pm[issueKey] ? 'a stated position exists on this issue — that row belongs to the say-vs-do cards' : '') ||
        rdBlockIndex(idx) ||
        blockIssue(pid, issueKey, '', lead.item || {}) ||
        wave1Hold(issueKey) ||
        lead.blocked;
      out.push(cand);
    });

    // Deepest record first, then the clearest direction — so a host surface that
    // takes the first card takes the best-evidenced one.
    out.forEach(function (c) {
      c.strength = (c.idx.judged * 10) + Math.abs(c.idx.advances - c.idx.opposes);
    });
    out.sort(function (a, b) { return b.strength - a.strength; });
    return out;
  }

  // The face of one cited example on a record-direction card. Built by the same
  // sideFace() every split card uses, then relabelled: "VOTED WITH THEIR
  // POSITION" is a sentence about a position, and there is no position here.
  // Both sides are relabelled, not only the non-vote one, because on this card
  // the vote wording is wrong for the same reason on both.
  function rdFace(item, issueKey, side) {
    var face = sideFace(item, issueKey, side === 'advances' ? 'with' : 'against');
    var advanced = side === 'advances';
    face.head = advanced ? 'ADVANCED IT' : 'CUT AGAINST IT';
    face.lead = advanced ? 'Advanced it' : 'Cut against it';
    face.tail = advanced ? 'Advanced it' : 'Cut against it';
    return face;
  }

  function recordDirectionCard(cand) {
    if (!cand || cand.blocked) return null;
    var idx = cand.idx;
    var leadItem = cand.lead && cand.lead.item;
    if (!leadItem || !idx || !idx.counted) return null;

    // A record that ran both ways, deep enough to state its counts. It has no
    // direction, so every sentence below that would name one is skipped rather
    // than softened, and the card's own flag says which shape it is.
    var isSplit = !idx.characterised;

    // baseCard with a null stance: same identity, same issue chip, same footer
    // rules, same fail-closed on an address that will not print — and no SAID
    // half, because there is nothing said to put in it.
    var card = baseCard(cand.pid, leadItem, cand.issueKey, null, rdVerdict(isSplit));
    if (!card) return null;

    var issueName = (card.issue && card.issue.label) || 'this issue';
    var acts = !!cand.acts;
    var manyNoun = acts ? 'formal actions' : 'recorded votes';
    var oneNoun = acts ? 'formal action' : 'recorded vote';
    var n = idx.judged, adv = idx.advances, opp = idx.opposes;
    var uniform = !adv || !opp;
    var leadWord = (idx.lead === 'opposes') ? 'cut against it' : 'advanced it';

    card.origin = RD_ORIGIN;
    card.verdict = rdVerdict(isSplit);
    // The stamp on every other card is headed VERDICT. This one is not a verdict
    // on anybody — it reports what the record did — so it says so, and the
    // renderer prints whatever this field holds.
    card.stampKicker = 'RECORD DIRECTION';
    card.impact = 'record';
    card.recordLabel = isSplit ? 'WHAT THE RECORD DID — BOTH WAYS' : 'WHAT THE RECORD DID';
    // The disclosure, on the image, in the place the stated position would have
    // been. It travels with the pixels because the pixels are what travel.
    card.recordNote = RD_NOTE;

    // The finding. Counts, in words, in the three forms the record comes in.
    // The split form leads with the total and then states both sides, in the
    // index's own order — it names no lead, because there is none to name.
    card.headline = uniform
      ? ('On ' + issueName + ', ' + card.name + '’s ' + manyNoun + ' all ' + leadWord +
         ' (' + n + ').')
      : isSplit
        ? ('On ' + issueName + ', ' + card.name + '’s record ran both ways — ' + n + ' ' +
           manyNoun + ': ' + idx.clause + '.')
        : ('On ' + issueName + ', ' + card.name + ' has ' + n + ' ' + manyNoun + ' — ' +
           adv + ' advanced it, ' + opp + ' cut against it.');

    // What kind of act the COUNTS cover — the same two-part answer the split card
    // gives, for the same reason: a card counting a cosponsorship alongside a
    // roll call may not be worded as though every item on it were a floor vote.
    card.instrument = acts
      ? { key: 'record', label: 'Recorded votes and other formal actions',
          strength: cand.soft ? 'supporting' : 'deciding',
          note: 'This card counts recorded votes together with other formal actions on ' +
                'the record. Each example below says which it is.' }
      : { key: 'vote', label: INSTRUMENTS.vote.label, strength: 'deciding', note: '' };
    card.effectLabel = acts ? 'What kind of actions these are' : '';

    // Provenance, read straight off the index. This is what the public gate and
    // the tests check the finished copy against, so neither has to re-derive it.
    card.recordDirection = {
      token: idx.token, lead: idx.lead, judged: n, advances: adv, opposes: opp,
      primary: idx.primary, total: idx.total, uniform: uniform,
      characterised: !!idx.characterised, counted: !!idx.counted, split: isSplit,
      acts: acts, soft: !!cand.soft, steppedDown: !!cand.steppedDown
    };

    var otherItem = cand.other && cand.other.item;
    if (!uniform && otherItem) {
      // Both sides citable: one named, dated, sourced example on each, in the
      // same both-sides block the split card already draws. Which item goes on
      // which side is read off the side each was FETCHED for, never off the
      // index's lead — a split has no lead, and reading a null one would put
      // both examples under the wrong heading.
      var advItem = (cand.leadSide === 'advances') ? leadItem : otherItem;
      var oppItem = (cand.leadSide === 'advances') ? otherItem : leadItem;
      card.sides = {
        counts: { with: adv, against: opp },
        with: rdFace(advItem, cand.issueKey, 'advances'),
        against: rdFace(oppItem, cand.issueKey, 'opposes')
      };
      if (!card.sides.with.verify || card.sides.with.verify.length > VERIFY_MAX) return null;
      if (!card.sides.against.verify || card.sides.against.verify.length > VERIFY_MAX) return null;
      // baseCard filled the fact block from the lead example alone, which under a
      // headline about N items would print one measure's title as if it were the
      // record. The caveat takes its place.
      card.factParts = [];
      card.facts = 'Counts cover every judged ' + oneNoun +
        '; each example is the strongest we can cite.';
      card.date = dateSpan(advItem, oppItem);
      card.source = {
        url: recordPageUrl(cand.pid, cand.issueKey),
        label: 'Official record — ' + manyNoun + ' on this issue'
      };
      card.verifyUrl = printableUrl(card.source.url);
      if (!card.verifyUrl || card.verifyUrl.length > VERIFY_MAX) return null;
      card.measureNumbers = [advItem.number || '', oppItem.number || ''].filter(Boolean);
      card.sourceStored = [(advItem.source && advItem.source.url) || '',
                           (oppItem.source && oppItem.source.url) || ''].filter(Boolean).join(' | ');
    }

    // The counted short form, for the post and the caption. Always the counts —
    // never the one measure baseCard would otherwise name under a sentence about
    // N of them.
    card.didLine = uniform
      ? ('All ' + n + ' ' + manyNoun + ' ' + leadWord)
      : isSplit
        ? (n + ' ' + manyNoun + ', both ways — ' + idx.clause)
        : (n + ' ' + manyNoun + ' — ' + adv + ' advanced it, ' + opp + ' cut against it');
    card.countsNote = 'Counts cover every judged ' + oneNoun + ' on this issue; ' +
      (card.sides
        ? 'each example above is the strongest one on its side that can be cited on its own.'
        : 'the example shown is the strongest one that can be cited on its own.');

    card.score = cand.strength || 0;
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
      // Act-aware for the same reason every other stamp is: "One Vote · Two
      // Outcomes" over an executive order names a mechanism that did not happen.
      card.verdict = (card.instrument && card.instrument.key !== 'vote')
        ? actVerdict(VERDICTS.omnibus) : VERDICTS.omnibus;
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
      // A refused split candidate can have no cited vote at all — that IS the
      // refusal — so the item is read defensively here and nowhere else.
      var it = c.item || {};
      var ins = instrumentOf(it);
      return {
        pid: c.pid, issueKey: c.issueKey, want: c.want,
        measure: it.number || '', measureType: it.measureType || '',
        question: it.action || '',
        // WHAT KIND of act this candidate is, alongside the reason it was kept or
        // dropped — so the exclusion list can be read per instrument rather than
        // only in total, and so a refusal that only ever hits one instrument is
        // visible as that rather than as a general failure.
        instrument: ins ? ins.key : '', instrumentLabel: ins ? ins.label : '',
        // On a non-vote there is no yea/nay to report; the direction is the
        // boolean the record stores, said in words that are not vote words.
        position: (ins && ins.key !== 'vote')
          ? (it.supports === true ? 'supports' : it.supports === false ? 'opposes' : '')
          : (it.position || ''),
        date: dayOf(it.date), netVerdict: c.summary.netVerdict,
        eligible: !c.blocked, reason: c.blocked || 'eligible'
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE PUBLIC SHARE GATE  ·  eighteen guards decide what a card may SAY;
  // this decides what leaves the building
  // ──────────────────────────────────────────────────────────────────────────
  // Everything above is about truth: a card that survives the guard chain is one
  // whose stance, mapping, citation and verdict all hold up. That is necessary
  // and it is not sufficient. A card can be entirely true and still be the wrong
  // thing to put in front of a stranger — a member with one judged vote on the
  // issue, where the verdict is a single roll call wearing the clothes of a
  // pattern; a member whose own record in the app is incomplete, so the card
  // prints without a party chip or an office line and looks like a draft.
  //
  // So the public set is gated a second time, and gated by allowlist: a card
  // ships because it cleared this list, not because nothing objected. Adding a
  // criterion here can only ever shrink the public set, and a card that stops
  // meeting one stops shipping the moment the data changes — there is no stored
  // list of blessed cards to go stale.
  //
  // The four hard criteria are the four the trust pass was run to establish:
  // confirmed citation (guard 14), no sign inversion (guard 15), no topical
  // mismatch (guards 16, 17 and the wave-1 key holds), no curator housekeeping
  // (guard 18). All four are enforced upstream, so a built card already has
  // them; they are re-asserted here on the finished text rather than trusted,
  // because this is the last place to catch a renderer that reintroduced one.
  //
  // The fifth criterion — "≥2 judged votes" — is asked for as PREFERRED, not
  // required, and it is treated that way: it ranks and labels rather than
  // blocks. A single judged vote is not false, it is thin, and the honest
  // handling of thin is to stop leading with it, not to pretend it is not there.
  var PUBLIC_MIN_JUDGED = 2;

  // ── Two tripwires on the text this file composes ──────────────────────────
  // The first is the wall between a deciding act and a supporting one. A card
  // built on a cosponsorship, a statement or a court filing may say what it is
  // and may travel; what it may not do is borrow the vocabulary of a roll call,
  // because "Voted Another" over a cosponsorship is a false statement about the
  // mechanism even when the direction is right. The second is the wall this
  // product has had from the start: no card frames a formal act as party
  // behaviour. Neither regex is a substitute for writing the copy correctly —
  // they are there so a future edit that reintroduces the wording cannot ship
  // quietly.
  //
  // Both are run over COMPOSED text only — the headline, the verdict stamp, the
  // short act line, the counts caveat, the both-sides labels. A measure title, a
  // curated rationale and a stated position are quoted, not written here, and a
  // bill actually named the Voting Rights Act is not this card calling a
  // signature a vote.
  var VOTE_WORD_RE = /\b(?:voted?|votes|voting|yea|nay|roll\s*call|on\s+passage)\b/i;
  var PARTY_FRAME_RE = /\b(?:broke\s+with\s+(?:their|his|her|the)\s+party|party\s+lines?|party\s+loyalty|caucus|crossed\s+the\s+aisle|bipartisan)\b/i;

  // ── Three more, asked only of the record-direction feed ───────────────────
  // That card is the one shape in this file with no stated position behind it,
  // which makes three specific failures possible that cannot happen above:
  // reading as a stance it never had, borrowing a said-vs-did verdict word for a
  // comparison that never happened, or printing the direction as a proportion —
  // which is the exact move that would turn a description of a record into a
  // second score sitting next to Direction Match.
  //
  // TWO DIFFERENT SURFACES, because the three failures are not the same kind of
  // failure:
  //
  //   COMPOSED copy — the sentences this file writes: the headline, the stamp,
  //     the counts note, the side labels. A stance word or a verdict token here
  //     is the CARD making a claim it has no basis for, and all three denylists
  //     run over it. The measure title, the curated rationale and the chamber
  //     question are NOT in it: those are quoted, they already cleared guards 13,
  //     15 and 16 at the item level, and every say-vs-do card prints them under
  //     exactly that clearance. A bill actually named the Taxpayer Support Act is
  //     not this card claiming the member supports anything, and refusing it here
  //     would be a lottery on which bills have the word in their title rather
  //     than a wall against anything.
  //     The issue's own curated NAME is excluded for the same reason — "🇮🇱
  //     Support for Israel" is the heading a reader is already looking at, not a
  //     sentence this card wrote.
  //
  //   PRINTED text — everything a reader can see, quotes included. Only the
  //     PROPORTION check runs over this, and it is the one wall the brief states
  //     flatly: no percentage on the card, from any source. A share printed
  //     beside a count is the exact shape of a second score whether we wrote it
  //     or quoted it, so this one is stricter than the say-vs-do cards, on
  //     purpose.
  var RD_PROPORTION_RE = /\d\s*%|\b\d+(?:\.\d+)?\s*(?:percent|pct)\b|\b\d+\s*out\s+of\s+\d|\b(?:share|proportion|ratio|rate)\s+of\b/i;
  var RD_STANCE_WORD_RE = /\b(?:supports?|supported|supporting|opposes?|opposed|backs?\s+it\s+up|backed\s+it\s+up|stated\s+stance|campaigned|promised|pledged|says?\s+one\s+thing|their\s+position|his\s+position|her\s+position)\b/i;
  var RD_SAYDO_TOKEN_RE = /\b(?:contradicts?|contradicted|contradiction|consistent|inconsistent|backs?\s+up|backed\s+up|matched\s+the\s+words|kept\s+(?:their|his|her)\s+word|broke\s+(?:their|his|her)\s+word)\b/i;

  // The denylist above is a fixed list of words. This is the moving one: the
  // LIVE say-vs-do verdict labels, read off PDXConsistency.VERDICTS at call time
  // rather than copied here, so renaming a verdict cannot quietly make its new
  // name sayable on a card about a comparison that never happened.
  //   Only the four labels that make a claim about said-vs-did are checked. The
  // inventory labels ("No record yet", "Limited record") assert nothing this
  // card could borrow, and "No stated stance" is the very condition it is built
  // under — refusing that string would refuse the card for being honest.
  var SAYDO_CLAIM_VERDICTS = { consistent: 1, contradicts: 1, mixed: 1, flag: 1 };
  function rdBorrowedVerdict(text) {
    var t = String(text || '').toLowerCase();
    var V = (window.PDXConsistency && window.PDXConsistency.VERDICTS) || {};
    var hit = '';
    Object.keys(V).forEach(function (k) {
      if (hit || !SAYDO_CLAIM_VERDICTS[k]) return;
      var lab = V[k] && V[k].label;
      if (lab && t.indexOf(String(lab).toLowerCase()) !== -1) hit = lab;
    });
    return hit;
  }

  // Exactly the strings this file writes onto a record-direction card. Quoted
  // material — the measure title, the curated rationale, the chamber question —
  // is deliberately absent, and so is the fixed disclosure: that line is checked
  // by equality against RD_NOTE instead, because it contains the very words
  // ("not a stated stance") the denylists exist to catch, and a denylist that has
  // to be taught an exception is a denylist with a hole.
  function rdWritten(card) {
    var parts = [card.headline, card.verdict && card.verdict.label, card.stampKicker,
                 card.recordLabel, card.didLine, card.countsNote,
                 card.effectLabel, card.instrument && card.instrument.note,
                 card.source && card.source.label];
    var faces = card.sides ? [card.sides.with, card.sides.against] : [];
    faces.forEach(function (f) { if (f) parts.push(f.head, f.lead, f.tail); });
    return parts.filter(Boolean).join(' · ');
  }

  // The same copy with the issue's own curated name taken out of it. The name is
  // the heading the reader is already under — "🇮🇱 Support for Israel" is not this
  // card claiming anybody supports anything — so it is neutralised rather than
  // dropped, leaving the rest of the sentence around it still readable by the
  // vocabulary walls.
  function rdComposed(card) {
    var text = rdWritten(card);
    var label = (card.issue && card.issue.label) || '';
    return label ? text.split(label).join('this issue') : text;
  }

  // Everything a reader can SEE on the finished card, quotes and heading
  // included. Only the proportion wall is asked of this, and it is asked of
  // every source equally.
  function rdPrinted(card) {
    var parts = [rdWritten(card), (card.issue && card.issue.label) || '',
                 card.recordNote, card.facts];
    (card.factParts || []).forEach(function (p) { parts.push(p); });
    var faces = card.sides ? [card.sides.with, card.sides.against] : [];
    faces.forEach(function (f) {
      if (f) parts.push(f.proof, f.title, f.effect, f.number, f.label);
    });
    if (!card.sides) parts.push(card.measureNumber, card.measureTitle);
    return parts.filter(Boolean).join(' · ');
  }

  function rdPublicBlock(card) {
    if (card.said) {
      return 'record-direction card carries a stated position — it reports the record only';
    }
    var rd = card.recordDirection;
    if (!rd || !rd.counted) {
      return 'record-direction card is not backed by a counted record row';
    }
    // THE TWO SHAPES, EACH HELD TO ITS OWN CLAIM. A card that says what the
    // record DID must sit on a row that characterises one; a card that says the
    // record ran BOTH WAYS must sit on a row that refused to. Asked in both
    // directions, so neither shape can borrow the other's permission — a split
    // wearing a characterised flag would be a direction asserted where the index
    // found none, and a direction card without one would be the reverse.
    if (rd.split && rd.characterised) {
      return 'record-direction card reports a split on a row that characterised a direction';
    }
    if (!rd.split && !rd.characterised) {
      return 'record-direction card is not backed by a characterised record row';
    }
    // A split with one side empty is not a split. The counts are the finding on
    // this card, so an arithmetic shape that contradicts its own headline stops
    // here rather than printing.
    if (rd.split && !(rd.advances && rd.opposes)) {
      return 'record-direction card reports a record that ran both ways with only one side on it';
    }
    if (rd.split && rd.lead) {
      return 'record-direction card names a leading side on a record that ran both ways';
    }
    // The absence of a stated position is the whole premise of this card, so the
    // line that says so is required verbatim — not merely present, not merely
    // similar. A card that reached a stranger without it would be a counted
    // record wearing the layout a stated position usually occupies.
    if (card.recordNote !== RD_NOTE) {
      return 'record-direction card does not carry the no-stated-position disclosure verbatim';
    }
    // The counts printed on the card ARE the index's counts. Re-asserted here so
    // a future edit that recounted them off the cited examples cannot ship.
    if (!rd.judged || rd.advances + rd.opposes !== rd.judged) {
      return 'record-direction counts do not add up to the judged record';
    }
    if (rd.uniform && rd.advances && rd.opposes) {
      return 'record-direction card claims a uniform record that ran both ways';
    }
    if (!rd.uniform && !(rd.advances && rd.opposes)) {
      return 'record-direction card claims both sides on a one-sided record';
    }
    // The proportion wall is asked of everything a reader can SEE — the quoted
    // measure title and the curated rationale included. A share printed beside a
    // count is the shape of a second score whether this file wrote it or quoted
    // it, so this one check is stricter here than anywhere else in the file.
    if (RD_PROPORTION_RE.test(rdPrinted(card))) {
      return 'record-direction card prints a proportion — the record’s direction is counts, not a second score';
    }
    // The three vocabulary walls are asked only of the copy this file COMPOSES.
    var text = rdComposed(card);
    if (RD_STANCE_WORD_RE.test(text)) {
      return 'record-direction card words the record as a stated position';
    }
    if (RD_SAYDO_TOKEN_RE.test(text)) {
      return 'record-direction card borrows a said-vs-did verdict token for a comparison that never happened';
    }
    var borrowed = rdBorrowedVerdict(text);
    if (borrowed) {
      return 'record-direction card prints the “' + borrowed +
        '” say-vs-do verdict for a comparison that never happened';
    }
    if (PARTY_FRAME_RE.test(text)) {
      return 'record-direction card frames a formal action as party behaviour';
    }
    // Vote vocabulary is correct on a card whose counts are all roll calls, and
    // false on one whose counts are not. Asked here rather than left to the
    // general instrument check below, which does not see recordNote or facts.
    if (rd.acts && VOTE_WORD_RE.test(text)) {
      return 'record-direction card is worded as votes and the record it counts is not all votes';
    }
    return '';
  }

  function publicShareBlock(card) {
    if (!card) return 'no card';
    if (!card.hasOffice || !card.party || !card.party.label) {
      return 'member profile is incomplete — the card would print without party or office and read as a draft';
    }
    if (!card.date) return 'no vote date to print';
    if (!card.source || !card.source.url || !card.verifyUrl) return 'no citation a reader could follow';
    // The record-direction card is the one shape with no SAID half by design, so
    // it answers a different question here — and a stricter one, because the
    // absence of a stated position is the thing that has to stay true all the
    // way to the pixels. Every card above it is unaffected.
    if (card.origin === RD_ORIGIN) {
      var rdWhy = rdPublicBlock(card);
      if (rdWhy) return rdWhy;
    } else if (!card.said || !String(card.said.text || '').trim()) {
      return 'no stated position to line the vote up against';
    }
    // A split card carries two cited votes, so everything below that reads ONE
    // measure or ONE fact string is asked of both. A card that cited a clean vote
    // on one side and a held one on the other would otherwise pass a gate written
    // when every card had exactly one measure on it.
    if (card.sides) {
      if (!card.sides.with || !card.sides.against) {
        return 'split card is missing the cited vote on one side — it would read as a one-sided card';
      }
      var sideText = [card.sides.with, card.sides.against].map(function (s) {
        return [s.proof, s.title, s.effect].filter(Boolean).join(' ');
      }).join(' ');
      if (HOUSEKEEPING_LEAK_RE.test(sideText)) {
        return 'finished both-sides text still carries curator housekeeping';
      }
      if (!card.sides.with.url || !card.sides.against.url) {
        return 'one side of the split has no citation a reader could follow';
      }
      // No percentage may reach a public card. The counts are counts; a share
      // of the record printed as a number next to Direction Match reads as a
      // second score, and there is only one score.
      if (/\d\s*%/.test(String(card.headline || '') + ' ' + String(card.facts || ''))) {
        return 'split card prints a percentage — a share of the record reads as a second score';
      }
    }
    // Re-assert the trust criteria on the finished public text.
    // ── What kind of act, said on the card, before it may leave ──────────────
    // Requirement 2 in one place: a public card states its instrument, and a
    // supporting act carries the sentence that keeps it from being read as a
    // deciding one. Asked of the finished card rather than of the item, because
    // this is the last surface before a stranger sees it.
    var instr = card.instrument;
    if (!instr || !instr.label) return 'card does not say what kind of act it is';
    if (instr.key !== 'vote' && !instr.note) {
      return 'card does not say how this act differs from a deciding floor vote';
    }
    var composed = [card.headline, card.verdict && card.verdict.label, card.didLine,
                    card.countsNote, card.recordLabel];
    var faces = card.sides ? [card.sides.with, card.sides.against] : [];
    for (var f = 0; f < faces.length; f++) {
      var face = faces[f];
      if (!face.instrument || !face.instrument.label) {
        return 'one side of the split does not say what kind of act it is';
      }
      if (face.instrument.key === 'vote') continue;
      if (!face.head || !face.lead || !face.tail) {
        return 'a side that is not a floor vote is still labelled as one';
      }
      composed.push(face.proof, face.head, face.lead, face.tail);
    }
    var composedText = composed.filter(Boolean).join(' · ');
    if (instr.key !== 'vote' && VOTE_WORD_RE.test(composedText)) {
      return 'card is worded as a floor vote and the act it reports is not one';
    }
    if (PARTY_FRAME_RE.test(composedText)) {
      return 'card frames a formal act as party behaviour';
    }
    if (HOUSEKEEPING_LEAK_RE.test(String(card.facts || ''))) {
      return 'finished fact text still carries curator housekeeping';
    }
    // Guard 10 again, on the finished text — asked only where there IS a stated
    // position. A record-direction card has none by construction, and
    // rdPublicBlock() has already required that to still be true here.
    if (card.origin !== RD_ORIGIN) {
      var circular = blockStance(card.said.text);
      if (circular) return 'finished stance text reads as a vote — ' + circular;
    }
    if (WAVE1_HOLD_ISSUE_KEYS[card.issueKey]) return WAVE1_HOLD_ISSUE_KEYS[card.issueKey];
    // Every measure the card names, not only the one it leads with.
    var numbers = (card.measureNumbers && card.measureNumbers.length)
      ? card.measureNumbers : [card.measureNumber];
    for (var i = 0; i < numbers.length; i++) {
      var pair = WAVE1_HOLD_PAIRS[String(numbers[i]) + ' :: ' + card.issueKey];
      if (pair) return pair;
    }
    return '';
  }

  // 'core'  — public and backed by a record, the set to publish FROM
  // 'thin'  — public and true, but one judged vote deep; shareable in the app,
  //           not something to lead a campaign with
  // ''      — not public
  function publicTier(card) {
    if (publicShareBlock(card)) return '';
    // Depth, whichever feed the card came from: a say-vs-do card counts the
    // judged items behind its verdict, a record-direction card counts the judged
    // items behind its direction. Same question, same threshold.
    var total = (card.recordSummary && card.recordSummary.total) ||
                (card.recordDirection && card.recordDirection.judged) || 0;
    return total >= PUBLIC_MIN_JUDGED ? 'core' : 'thin';
  }

  // Public cards, deepest record first, so a host surface that takes the first
  // one takes the strongest one.
  function publicCardsFor(pid, opts) {
    return cardsFor(pid, opts)
      .filter(function (c) { return !publicShareBlock(c); })
      .sort(function (a, b) {
        var d = (publicTier(a) === 'core' ? 0 : 1) - (publicTier(b) === 'core' ? 0 : 1);
        return d || (b.score || 0) - (a.score || 0);
      });
  }
  function publicOmnibus(pid, number) {
    var o = omnibus(pid, number);
    return (o && !publicShareBlock(o)) ? o : null;
  }
  // Why a BUILT card is not public, and how deep the ones that are go. Cards
  // that never built are already in audit() with the guard reason that stopped
  // them.
  function publicAudit(pid) {
    return cardsFor(pid).map(function (c) {
      var r = publicShareBlock(c);
      return { pid: c.pid, issueKey: c.issueKey, measure: c.measureNumber || '',
               verdict: c.verdict && c.verdict.key, judged: (c.recordSummary || {}).total || 0,
               tier: publicTier(c), publicEligible: !r, reason: r || 'public' };
    });
  }

  // ── The record-direction feed's own reads ─────────────────────────────────
  // Kept out of cardsFor / publicCardsFor / audit on purpose. Those three are
  // the say-vs-do card feed, and every count taken off them — card volume, the
  // wave-1 exclusion list, the public tally — has to mean the same thing after
  // this slice as before it. A caller that wants record-direction cards asks for
  // them by name.
  function recordDirectionCardsFor(pid, opts) {
    opts = opts || {};
    var cards = [];
    recordDirectionCandidates(pid).forEach(function (c) {
      if (opts.issueKey && c.issueKey !== opts.issueKey) return;
      var card = recordDirectionCard(c);
      if (!card) return;
      for (var i = 0; i < cards.length; i++) if (cards[i].issueKey === card.issueKey) return;
      cards.push(card);
    });
    return cards;
  }
  function publicRecordDirectionCardsFor(pid, opts) {
    return recordDirectionCardsFor(pid, opts)
      .filter(function (c) { return !publicShareBlock(c); })
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
  }
  function recordDirection(pid, issueKey) {
    if (!pid) return null;
    var list = publicRecordDirectionCardsFor(pid, issueKey ? { issueKey: issueKey } : {});
    return list.length ? list[0] : null;
  }
  // Every record-direction candidate with the reason it was kept or dropped, in
  // the same shape audit() reports — including the index token, so the coverage
  // of this feed can be read against the row model it is derived from.
  function recordDirectionAudit(pid) {
    return recordDirectionCandidates(pid).map(function (c) {
      var it = c.item || {};
      var ins = instrumentOf(it);
      var built = c.blocked ? null : recordDirectionCard(c);
      var pub = built ? publicShareBlock(built) : '';
      return {
        pid: c.pid, issueKey: c.issueKey, want: c.want,
        token: c.idx.token, characterised: !!c.idx.characterised,
        counted: !!c.idx.counted,
        // A row the index refused to characterise but allowed to state its
        // counts. Reported separately so the split population can be read off
        // this audit without inferring it from two other columns.
        split: !!(c.idx.counted && !c.idx.characterised),
        judged: c.idx.judged, advances: c.idx.advances, opposes: c.idx.opposes,
        lead: c.idx.lead || '', suppressed: c.idx.suppressed || '',
        uniform: !(c.idx.advances && c.idx.opposes),
        bothSidesCited: !!(built && built.sides),
        measure: it.number || '', instrument: ins ? ins.key : '',
        date: dayOf(it.date),
        eligible: !c.blocked, reason: c.blocked || 'eligible',
        built: !!built,
        tier: built ? publicTier(built) : '',
        publicEligible: !!(built && !pub),
        publicReason: built ? (pub || 'public') : (c.blocked || 'not built')
      };
    });
  }


  // ══════════════════════════════════════════════════════════════════════════
  // THE WHOLE-PERSON CARD  ·  words vs formal record, counted across issues
  // ──────────────────────────────────────────────────────────────────────────
  // Every card above this line is about ONE thing: one vote, or one issue's
  // record. That is the right shape for evidence and the wrong shape for the
  // question a reader actually arrives with, which is about a PERSON — do this
  // member's stated positions line up with what their formal record did, or not.
  // Answering it by sharing four single-issue cards asks the reader to do the
  // arithmetic and to trust that the four were not cherry-picked. This card does
  // the arithmetic in the open and states how many issues it covered.
  //
  // WHAT IT CLAIMS. Three counts and nothing else:
  //   "Compared 9 stated positions to the voting pattern —
  //    ✓ 5 backed by the record · ✕ 3 cut the other way · ◑ 1 split"
  // Each of those 9 is an issue where BOTH halves exist and both have a pole:
  // a stated position that says support or oppose, and a formal-record pattern
  // the pattern engine reads at Strongly, Mostly or Split. That is the whole
  // comparable-issue rule, and it is deliberately narrow in both directions.
  //
  // WHAT IT IS NOT, and where each wall is:
  //   · NOT A SECOND SCORE. No percentage, no ratio, no "agreement rate" — the
  //     counts print as counts, and wrPublicBlock() below refuses the card if a
  //     proportion appears anywhere a reader can see, the same tripwire the
  //     record-direction card is held to. ⚖️ Direction Match is the app's one
  //     headline figure about a person; a second figure sitting beside it would
  //     be read as a rival for it no matter what the label said.
  //   · NOT DIRECTION MATCH, and it cannot touch it. Nothing here writes: this
  //     lane is three READS — positionMapFor (the memoised stated-position map),
  //     window._pdxRecordDirection and window._recordPatternTier — which are the
  //     identical two engine functions the Formal Pattern Index rows are built
  //     from, so the counts on this card and the tiers on that index cannot
  //     disagree. No tier is written into a position map, and the say-vs-do feed
  //     (cardsFor / publicCardsFor / audit) is not called and not changed.
  //   · NOT BUILT ON THIN RECORD. A 1–3 vote lean reads "Thin supports" on the
  //     index and it is a true thing to show there, next to its own count, on a
  //     page. It is not a thing to count in a headline total that a stranger
  //     sees with no page around it, so thin rows are EXCLUDED from all three
  //     counts and disclosed as a sentence instead: "3 more issues had too
  //     little record to read." A number and a tick would file our own coverage
  //     gap as one of their positions.
  //   · NOT A SIDE WE INVENTED. A stated position of "mixed" has no pole, an
  //     issue with no directional pole gets no tier at all (the pattern engine
  //     returns null for those), and a directional tier whose tone is neither
  //     support nor oppose is dropped rather than guessed at.
  //   · NO PUBLIC-LANE RECEIPTS. The record read here is the formal record —
  //     votes and formal actions on file. Nothing from the public lane (rallies,
  //     statements, endorsements) is counted, because the card's own footer says
  //     "formal record only" and that sentence has to be true.
  //   · NO PARTY FRAMING. Enforced on the composed copy, like everywhere else.
  //
  // FAIL CLOSED. Under WR_MIN_COMPARABLE comparable issues there is no card at
  // all — not a card with a smaller number on it. Three issues is not a pattern
  // in a person, it is three issues, and the honest artefact for that is the
  // single-issue cards that already exist.
  // ══════════════════════════════════════════════════════════════════════════
  var WR_ORIGIN = 'word_record_pattern';

  // The stamp. Its own key and its own class: a downstream reader switching on
  // verdict.key must not be able to confuse a whole-person count with a verdict
  // about one vote ('contradicts'), or with the record-direction card's
  // 'record_direction'. "VERDICT" is also the wrong kicker over a tally, so the
  // card supplies its own.
  var WR_VERDICT = {
    key: 'word_record', cls: 'v-word-record', ico: '🏛',
    label: 'Words vs Formal Record', rank: 1
  };
  var WR_KICKER = 'RECORD CHECK';

  // The floor, as asked for. Four is where the three counts stop being a list of
  // issues and start being a shape — and it is the same number the pattern
  // engine uses for its own minimum judged pool, so a reader who reaches the
  // index behind this card finds it built on the same threshold.
  var WR_MIN_COMPARABLE = 4;

  // THE DISCLOSURE, verbatim, checked by equality below rather than by pattern —
  // for the same reason RD_NOTE is: an exception carved into a denylist is a
  // hole, and fixed text compared exactly cannot be softened, extended or
  // dropped. Three claims, because a reader needs all three: which record was
  // read, which score this is not, and what a "pattern" is.
  var WR_FOOT = 'Formal record only. Not Direction Match. Pattern is what the votes did, ' +
    'not a quoted speech.';

  var WR_HASH = 'wordrecord';
  var WR_NOUN = { one: 'vote', many: 'votes' };
  // A stated position may only enter the tally if it names a pole. `mixed` does
  // not, and neither does an absent one.
  var WR_STANCE_DIR = { support: 1, oppose: -1 };
  // The pattern engine's tone, as a pole. 'mixed' (a split) and 'muted' (no
  // pattern) are absent on purpose: they are not sides, so they cannot be
  // compared to one.
  var WR_TONE_DIR = { support: 1, oppose: -1 };
  // Which pattern is the better example when two rows disagree equally loudly.
  var WR_TIER_RANK = { strong: 0, mostly: 1, split: 2 };
  var WR_SHAPE_LABEL = {
    backed: 'backed by the record',
    against: 'cut the other way',
    split: 'split'
  };

  // The word the card uses for a stated position. Lower case and present tense
  // because it sits inside a sentence — "says supports, record strongly opposes"
  // — not at the head of a block.
  function wrSaysWord(stance) { return stance === 'oppose' ? 'opposes' : 'supports'; }

  // ── One row per comparable issue ──────────────────────────────────────────
  // The rows are the card. Everything below counts them, sorts them or writes a
  // sentence about them; nothing below re-derives a direction.
  //
  // Enumerated off the member's own warm record so an issue with a stated
  // position and no record at all never appears — there is nothing to compare it
  // to, and a row of "no record on file" in a tally of positions would read as a
  // finding about the person rather than about our coverage.
  function wrRows(pid) {
    pid = canonPid(pid);
    var out = [];
    if (!pid) return out;
    if (typeof window._pdxRecordDirection !== 'function') return out;
    if (typeof window._recordPatternTier !== 'function') return out;
    var records = recordsFor(pid);
    if (!records || !records.length) return out;
    var pm = positionMapFor(pid);
    if (!pm) return out;

    var keys = {};
    records.forEach(function (it) {
      if (!it || !Array.isArray(it.issues)) return;
      it.issues.forEach(function (m) { if (m && m.issueKey) keys[m.issueKey] = 1; });
    });

    Object.keys(keys).forEach(function (key) {
      var said = pm[key];
      // HALF ONE: a real stated position, with a pole. This is a READ of the
      // memoised position map — the same object Direction Match reads — and
      // nothing in this lane writes to it.
      var dir = said ? WR_STANCE_DIR[said.stance] : 0;
      if (!dir) return;

      var meta = issueMeta(key);
      // HALF TWO: the formal-record pattern, from the engine the Formal Pattern
      // Index rows are built from. Not a second reading of the votes.
      var idx = null, pat = null;
      try {
        idx = window._pdxRecordDirection(pid, key, {
          noun: WR_NOUN, label: (meta && meta.label) || ''
        });
        pat = window._recordPatternTier(idx, { noun: WR_NOUN });
      } catch (e) { return; }
      // null means the ISSUE has no directional pole (a balance key, an unmapped
      // key) or there is nothing on file. Either way there is no pattern to
      // compare, and the engine has already decided that — this lane does not
      // get a second opinion.
      if (!pat) return;

      var shape;
      if (pat.tier === 'split') {
        shape = 'split';
      } else if (pat.tier === 'strong' || pat.tier === 'mostly') {
        var pd = WR_TONE_DIR[pat.tone];
        if (!pd) return;                 // directional tier, no pole: invent nothing
        shape = (pd === dir) ? 'backed' : 'against';
      } else if (pat.tier === 'thin') {
        shape = 'thin';                  // disclosed, never counted
      } else {
        shape = 'unread';                // 'none' — no clear pattern yet
      }

      out.push({
        pid: pid, key: key, shape: shape,
        label: (meta && meta.label) || String(key),
        stance: said.stance, saidText: said.text || said.topic || '',
        saidSource: (said.source && said.source.url) || said.source || '',
        tier: pat.tier, tone: pat.tone, patLabel: pat.label,
        judged: pat.judged, advances: pat.advances, opposes: pat.opposes,
        counted: !!(idx && idx.counted), token: pat.token
      });
    });

    // Deepest first, then alphabetical — a stable order so the same member's
    // card is the same card twice, and so the example search below meets the
    // best-evidenced rows first.
    out.sort(function (a, b) {
      if (b.judged !== a.judged) return b.judged - a.judged;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    return out;
  }

  // The three counts, plus what was left out of them. `compared` is the sum of
  // the three and nothing else — the excluded rows are counted separately so the
  // sentence about them can be written from a number rather than from a guess.
  function wrTally(pid) {
    var rows = wrRows(pid);
    var t = { rows: rows, compared: 0, backed: 0, against: 0, split: 0, thin: 0, unread: 0 };
    rows.forEach(function (r) {
      if (r.shape === 'backed') { t.backed++; t.compared++; }
      else if (r.shape === 'against') { t.against++; t.compared++; }
      else if (r.shape === 'split') { t.split++; t.compared++; }
      else if (r.shape === 'thin') t.thin++;
      else t.unread++;
    });
    return t;
  }

  // What the counts left out, in one sentence or none. Thin and unread are named
  // separately because they are different facts: one is "we hold 1–3 votes here",
  // the other is "we hold votes and they do not form a pattern". Both are
  // statements about the record we have, so neither gets a tick or a number in
  // the tally above.
  function wrExcludedNote(t) {
    var bits = [];
    if (t.thin) {
      bits.push(t.thin + ' more ' + (t.thin === 1 ? 'issue had' : 'issues had') +
        ' too little record to read');
    }
    if (t.unread) {
      bits.push(t.unread + ' had no clear pattern yet');
    }
    if (!bits.length) return '';
    return 'Not counted: ' + bits.join('; ') + '.';
  }

  // ── The circularity check, for the example line only ──────────────────────
  // A "stated position" whose only evidence IS a vote makes a say-vs-record
  // comparison against itself: of course the record backs it, the record is
  // where the position came from. That is a weak COUNT and a dishonest EXAMPLE,
  // and the difference matters — a count is one of nine, while an example is the
  // one row a stranger will actually read and check. So a circular row stays in
  // the counts (dropping it would silently shrink a total nobody can audit) and
  // is never promoted to the example line.
  //
  // Cheap on purpose: three tests, run on the two or three candidate rows the
  // sort below reaches, never on the whole set.
  var WR_LEGIS_SRC_RE = /clerk\.house\.gov|senate\.gov\/legislative|congress\.gov\/(?:bill|amendment)|rollcall|roll_?call/i;
  var WR_MEASURE_RE = /\b(?:H\.?R\.?|S\.?|H\.?J\.?Res\.?|S\.?J\.?Res\.?|H\.?Res\.?|S\.?Res\.?|H\.?Amdt\.?|S\.?Amdt\.?)\s*\d+\b/ig;
  function wrCircular(pid, row, records) {
    if (!row) return false;
    var src = String(row.saidSource || '');
    // 1. The position is sourced to a legislative page — a roll call, a bill, an
    //    amendment. Then it is not a statement about a bill, it IS the bill.
    if (src && WR_LEGIS_SRC_RE.test(src)) return true;
    // 2. The position's address is one of the addresses in the record we counted.
    if (src) {
      var items = records || recordsFor(pid) || [];
      for (var i = 0; i < items.length; i++) {
        var u = items[i] && items[i].source && items[i].source.url;
        if (u && sameAddress(src, u)) return true;
      }
    }
    // 3. The position's own text names a measure. "Voted for H.R. 5376" is a
    //    vote wearing a stance's clothes.
    var txt = String(row.saidText || '');
    WR_MEASURE_RE.lastIndex = 0;
    if (WR_MEASURE_RE.test(txt)) return true;
    return false;
  }

  // ── The one optional example ──────────────────────────────────────────────
  // ONE, because two is a list and a list is a case being made. The discrepancy
  // leads when there is an honest one, because that is the finding a reader
  // cannot get from the counts alone; where there is no discrepancy the card
  // says so by showing its strongest AGREEMENT rather than by manufacturing a
  // gap out of a split or a thin row.
  //
  // Returns null freely. A card with three counts and no example is complete;
  // a card with an example we had to reach for is not.
  function wrExample(pid, t) {
    var records = recordsFor(pid) || [];
    var pick = function (shape) {
      var pool = t.rows.filter(function (r) { return r.shape === shape; });
      pool.sort(function (a, b) {
        var ra = WR_TIER_RANK[a.tier], rb = WR_TIER_RANK[b.tier];
        if (ra !== rb) return ra - rb;
        if (b.judged !== a.judged) return b.judged - a.judged;
        return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
      });
      for (var i = 0; i < pool.length; i++) {
        if (!wrCircular(pid, pool[i], records)) return pool[i];
      }
      return null;
    };
    // A split is neither a gap nor an agreement, so it is never the example: the
    // ◑ count already says it happened, and a sentence about it would have to
    // name a direction the pattern engine explicitly refused to name.
    var row = pick('against');
    var lead = 'Biggest gap';
    if (!row) { row = pick('backed'); lead = 'Strongest agreement'; }
    if (!row) return null;
    return {
      lead: lead,
      // "says supports, record strongly opposes" — the two halves, in the two
      // vocabularies they belong to. `patLabel` is the pattern engine's own
      // label, lower-cased to sit inside the sentence, never reworded.
      text: row.label + ' — says ' + wrSaysWord(row.stance) +
        ', record ' + String(row.patLabel || '').toLowerCase(),
      key: row.key, shape: row.shape
    };
  }

  // Where the card sends a reader: this member's own record page. Never an issue
  // address, because the card never named one issue — the example line names an
  // issue in words, and if it is ever made tappable it will carry its own link.
  function wrPageUrl(pid) {
    try {
      if (window.PDXShareLinks && typeof window.PDXShareLinks.wordrecord === 'function') {
        var u = window.PDXShareLinks.wordrecord(pid);
        if (u) return u;
      }
    } catch (e) {}
    return 'https://politidex.fyi/#' + WR_HASH + '=' + encodeURIComponent(pid);
  }

  // ── The card ──────────────────────────────────────────────────────────────
  // Built by hand rather than through baseCard(), and this is the one place in
  // the file where that is right: baseCard's whole signature is (pid, item,
  // issueKey, stance, verdict) — one cited item, one issue, one stance — and
  // this card has none of the three. Passing it a representative item would
  // print that item's bill title, chamber, result and date on a card whose
  // finding covers nine issues, which is the single most misleading thing this
  // artefact could do. So it shares baseCard's IDENTITY rules and its
  // fail-closed footer rule, and carries no measure block at all.
  function wordRecordCard(pid) {
    pid = canonPid(pid);
    if (!pid) return null;
    var t = wrTally(pid);
    // FAIL CLOSED. Not a smaller card — no card.
    if (t.compared < WR_MIN_COMPARABLE) return null;

    var d = polRec(pid);
    var name = (d && d.name) || prettyName(pid);
    var sub = d
      ? [d.office, d.district, d.state].map(function (x) { return String(x == null ? '' : x).trim(); })
          .filter(Boolean).join(' · ')
      : '';
    var photo = '';
    try { if (typeof window._getPhotoUrl === 'function') photo = window._getPhotoUrl(pid) || ''; } catch (e) {}

    var page = wrPageUrl(pid);
    var verify = printableUrl(page);
    if (!verify || verify.length > VERIFY_MAX) return null;   // fail closed, as everywhere

    return {
      // identity
      pid: pid, name: name, sub: sub,
      // NO PARTY CHIP. Every other card carries one and this one must not: a
      // count of one person's words against their own record is not a fact about
      // a party, and a coloured party ring around a tally invites exactly the
      // reading the hard walls forbid. The renderer already falls back to a
      // neutral ring when `party` is absent.
      party: null,
      photo: photo, hasOffice: !!(d && (d.office || d.district)),
      // NO ISSUE CHIP, for the same reason there is no measure block: the card
      // covers every comparable issue, so naming one at the top would be a claim
      // about scope that the counts underneath contradict.
      issueKey: '', issue: null,
      // NO SAID BLOCK. There is no single stated position on this card; there
      // are N of them, and the tally is how they are reported.
      said: null, saidLabel: '', saidNote: '',
      recordLabel: 'WORDS VS FORMAL RECORD',
      // The one sentence above the counts. Says what was compared and how many —
      // so the three numbers below are read against a denominator the reader was
      // given rather than one they have to assume.
      headline: 'Compared ' + t.compared + ' stated ' +
        (t.compared === 1 ? 'position' : 'positions') + ' to the voting pattern',
      // The counts, as counts. Three rows and no fourth — see the renderer.
      tally: {
        compared: t.compared, backed: t.backed, against: t.against, split: t.split,
        thin: t.thin, unread: t.unread,
        backedLabel: WR_SHAPE_LABEL.backed,
        againstLabel: WR_SHAPE_LABEL.against,
        splitLabel: WR_SHAPE_LABEL.split,
        note: wrExcludedNote(t),
        example: wrExample(pid, t)
      },
      // No measure block, and said so in the fields rather than left undefined:
      // the renderer skips an empty fact block, and an explicit empty is a
      // statement that this card has no measure to cite.
      facts: '', factParts: [], factProtected: false,
      why: '', date: '',
      source: { url: page, label: 'the official record' },
      // renderer hints
      category: 'official_record',
      impact: t.against > t.backed ? 'negative' : 'positive',
      verdict: WR_VERDICT,
      stampKicker: WR_KICKER,
      verifyUrl: verify,
      footNote: WR_FOOT,
      method: 'HOW THIS IS JUDGED: ' + METHOD_URL,
      // Provenance. `origin` is what keeps this artefact identifiable
      // downstream: nothing carrying it may be counted into a Say-vs-Do score or
      // into Direction Match.
      origin: WR_ORIGIN,
      rows: t.rows.map(function (r) {
        return { key: r.key, label: r.label, shape: r.shape, stance: r.stance,
                 tier: r.tier, judged: r.judged };
      }),
      hash: '#' + WR_HASH + '=' + encodeURIComponent(pid),
      score: 0
    };
  }

  // ── The public gate for this lane ─────────────────────────────────────────
  // Same job as rdPublicBlock: the guards are asked of the FINISHED card, on the
  // text a reader will actually see, so a future edit that reworded a sentence
  // cannot slip past a check written against the old wording. Returns '' when
  // the card may leave the app.
  function wrComposed(card) {
    var t = card.tally || {};
    return [card.recordLabel, card.headline, t.backedLabel, t.againstLabel, t.splitLabel,
            t.note, t.example && t.example.lead, t.example && t.example.text,
            card.footNote, card.verdict && card.verdict.label]
      .filter(Boolean).join(' · ');
  }
  function wrPublicBlock(card) {
    if (!card) return 'no card';
    if (card.origin !== WR_ORIGIN) return 'not a words-vs-record card';
    var t = card.tally;
    if (!t) return 'words-vs-record card carries no tally';
    // The floor, re-asserted on the finished card. wordRecordCard() already
    // refused below it; this catches a card built by any other path.
    if (t.compared < WR_MIN_COMPARABLE) {
      return 'words-vs-record card compares fewer than ' + WR_MIN_COMPARABLE + ' issues';
    }
    // The three counts ARE the comparison. Re-added here so an edit that
    // recounted them from anywhere else cannot ship.
    if (t.backed + t.against + t.split !== t.compared) {
      return 'words-vs-record counts do not add up to the issues compared';
    }
    // THIN NEVER ENTERS THE HEADLINE. Checked as arithmetic rather than as
    // intent: every counted row is a strong, mostly or split pattern, so the
    // number of counted rows and the number of non-thin, non-unread rows must be
    // the same number.
    var rows = card.rows || [];
    var counted = 0, excluded = 0;
    rows.forEach(function (r) {
      if (r.shape === 'thin' || r.shape === 'unread') excluded++;
      else counted++;
    });
    if (counted !== t.compared) {
      return 'words-vs-record card counts a row that is not a comparable issue';
    }
    if (excluded !== t.thin + t.unread) {
      return 'words-vs-record card mis-states how many issues it left out';
    }
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].shape === 'thin' && rows[i].tier !== 'thin') {
        return 'words-vs-record card mislabels a thin row';
      }
      if (rows[i].shape !== 'thin' && rows[i].shape !== 'unread' &&
          !(rows[i].tier === 'strong' || rows[i].tier === 'mostly' || rows[i].tier === 'split')) {
        return 'words-vs-record card counts a pattern the engine did not read at ' +
          'Strongly, Mostly or Split';
      }
    }
    // A stated position is required on every counted row, and it must name a
    // pole. A row counted off a `mixed` position would be a comparison against
    // nothing.
    for (i = 0; i < rows.length; i++) {
      if (rows[i].shape === 'thin' || rows[i].shape === 'unread') continue;
      if (rows[i].stance !== 'support' && rows[i].stance !== 'oppose') {
        return 'words-vs-record card counts a row whose stated position names no side';
      }
    }
    // The example is never a split (no direction to state) and never circular.
    if (t.example) {
      if (t.example.shape !== 'against' && t.example.shape !== 'backed') {
        return 'words-vs-record example is not a gap or an agreement';
      }
      if (wrCircular(card.pid, findRow(card.pid, t.example.key))) {
        return 'words-vs-record example is a position sourced to the vote it is compared against';
      }
    }
    // The disclosure, verbatim.
    if (card.footNote !== WR_FOOT) {
      return 'words-vs-record card does not carry the formal-record disclosure verbatim';
    }
    // A single stated position, or a single measure, on a card whose finding is a
    // count across issues.
    if (card.said || card.issue || (card.facts && String(card.facts).trim())) {
      return 'words-vs-record card carries single-issue evidence on a whole-person finding';
    }
    // NO PARTY FRAMING, and no second score. Both asked of everything a reader
    // can see, both the same tripwires the rest of the file is held to.
    var text = wrComposed(card);
    if (PARTY_FRAME_RE.test(text)) {
      return 'words-vs-record card frames a formal record as party behaviour';
    }
    if (RD_PROPORTION_RE.test(text)) {
      return 'words-vs-record card prints a proportion — the finding is counts, not a ' +
        'second score';
    }
    return '';
  }
  // The row behind an example key, for the gate's re-check. Cheap: the tally is
  // already built by the time anything asks.
  function findRow(pid, key) {
    var rows = wrRows(pid);
    for (var i = 0; i < rows.length; i++) if (rows[i].key === key) return rows[i];
    return null;
  }

  // The public read. Named, not folded into publicCardsFor — the say-vs-do feed's
  // counts have to mean the same thing after this lane as before it.
  function wordRecord(pid) {
    var card = wordRecordCard(pid);
    if (!card) return null;
    return wrPublicBlock(card) ? null : card;
  }
  // Why a member has no card, in one sentence, for the audit and the tests.
  function wordRecordAudit(pid) {
    var t = wrTally(pid);
    var card = t.compared >= WR_MIN_COMPARABLE ? wordRecordCard(pid) : null;
    var blocked = card ? wrPublicBlock(card) : '';
    return {
      pid: canonPid(pid), compared: t.compared,
      backed: t.backed, against: t.against, split: t.split,
      thin: t.thin, unread: t.unread,
      floor: WR_MIN_COMPARABLE,
      built: !!card, publicEligible: !!(card && !blocked),
      reason: !card
        ? ('only ' + t.compared + ' comparable ' + (t.compared === 1 ? 'issue' : 'issues') +
           ' — the floor is ' + WR_MIN_COMPARABLE)
        : (blocked || 'public'),
      rows: t.rows.map(function (r) {
        return { key: r.key, label: r.label, shape: r.shape, stance: r.stance,
                 tier: r.tier, patLabel: r.patLabel, judged: r.judged };
      })
    };
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
      // The whole-person slot. A flag rather than a second function because the
      // hydrator, the click delegate, the reveal path and the fail-closed removal
      // are all one code path already — a host surface that wants the tally asks
      // for it here, and gets the same guards, the same warming and the same
      // "no card, no button" behaviour as every other slot in the app.
      (opts.whole ? ' data-pdxrc-whole="1"' : '') +
      (opts.stopKeys ? ' onkeydown="event.stopPropagation()"' : '') +
      ' aria-label="Share this Official Record card as an image">' +
      '<span class="pdxrc-ico" aria-hidden="true">🏛️</span>' +
      '<span class="pdxrc-lbl">Share</span></button>';
  }

  // The one place a button's attributes are turned into a card, used by BOTH the
  // hydrator and the click delegate — so what a button reveals and what it shares
  // can never be two different things.
  //
  // This is also where the public gate becomes real rather than advisory. The
  // affordance is the only sanctioned way out of the app, so filtering here
  // filters every surface at once, and a card that is true but not cleared for
  // the public wave simply has no Share button. When the host asked for a
  // member's best card and that card is not public, the next public one is
  // offered rather than none — the gate narrows what leaves, it does not
  // silently drop a member who has a publishable card further down the list.
  function cardForButton(btn) {
    if (!btn) return null;
    var pid = btn.getAttribute('data-pid');
    if (!pid) return null;
    var iss = btn.getAttribute('data-issue') || '';
    var num = btn.getAttribute('data-measure') || '';
    // ── The whole-person slot, asked first and answered alone ───────────────
    // A `whole` button means the host surface asked for the words-vs-formal-
    // record tally, and there is no fallback: if the member does not clear the
    // comparable-issue floor, this returns null and hydrate() removes the
    // button. Falling through to a single-issue card would be the worst possible
    // substitution — the reader tapped a control that promised a count across
    // their positions and would have been handed one vote.
    if (btn.getAttribute('data-pdxrc-whole') === '1') return wordRecord(pid);
    if (num) return publicOmnibus(pid, num);
    var list = publicCardsFor(pid, iss ? { issueKey: iss } : {});
    if (list.length) return list[0];
    // ── The record-direction fallback ───────────────────────────────────────
    // Reached ONLY where the say-vs-do feed has nothing to offer, which is the
    // definition of a row with no stated position — so this can add a Share
    // button where there was none and can never displace or re-rank one that
    // already existed. Said-vs-did card volume is unchanged by construction, not
    // by intention. Every host surface that already emits a button slot per
    // (member, issue) therefore gains the new card with no change of its own.
    var rd = publicRecordDirectionCardsFor(pid, iss ? { issueKey: iss } : {});
    return rd.length ? rd[0] : null;
  }

  function dropBtn(btn) { if (btn && btn.parentNode) btn.parentNode.removeChild(btn); }

  function revealBtn(btn, card) {
    var omni = card.verdict.key === 'omnibus';
    var split = card.verdict.key === 'mixed';
    // A record-direction card is about the record and about nothing said, so the
    // control cannot promise a vote-against-a-position share. It names what it
    // is instead, on the one piece of copy a reader sees before the card exists.
    var rec = card.origin === RD_ORIGIN;
    // ── The whole-person control ────────────────────────────────────────────
    // Returns early: every line below this point is written for a card that
    // names a measure and an issue, and this one names neither. The control says
    // what the card counts and how many issues it covered, because "Share this
    // vote" over a nine-issue tally is the first place a reader would be misled
    // and this is the only copy they see before the card exists.
    if (card.origin === WR_ORIGIN) {
      var n = (card.tally && card.tally.compared) || 0;
      btn.classList.add('pdxrc-' + card.verdict.cls);
      btn.innerHTML = '<span class="pdxrc-ico" aria-hidden="true">🏛️</span>' +
        '<span class="pdxrc-lbl">' + escA('Share words vs record') + '</span>';
      btn.setAttribute('title',
        'Share how ' + card.name + '’s stated positions line up with their formal ' +
        'record as an image — the card counts ' + n + ' ' +
        (n === 1 ? 'issue' : 'issues') + ' where both a stated position and a ' +
        'readable voting pattern exist, and prints the counts, one example and how ' +
        'it was judged. Formal record only; this is not Direction Match.');
      btn.setAttribute('aria-label',
        'Share ' + card.name + '’s words versus their formal record as an Official ' +
        'Record image');
      btn.removeAttribute('data-pdxrc-pending');
      btn.removeAttribute('hidden');
      return;
    }
    // What the reader is about to send, named on the control itself. The bill
    // number and the issue are the two things that make the image checkable, so
    // they are what the tooltip and the accessible name say. A split card names
    // both bills, because both of them are the evidence.
    var numbers = (card.measureNumbers && card.measureNumbers.length)
      ? card.measureNumbers.join(' & ') : card.measureNumber;
    var what = [numbers, card.issue && card.issue.label].filter(Boolean).join(' · ');
    // The control says what it is about to send. A button reading "Share this
    // vote" over a signed law or a cosponsorship is the first place a reader
    // would be misled, and it is the one piece of copy they see before the card
    // exists. "this act" is the honest general word for the instruments that are
    // not roll calls; a card built on one still names the specific instrument on
    // its own face.
    var isVote = !card.instrument || card.instrument.key === 'vote';
    var noun = isVote ? 'vote' : 'act';
    btn.classList.add('pdxrc-' + card.verdict.cls);
    btn.innerHTML = '<span class="pdxrc-ico" aria-hidden="true">' +
      (omni ? '⇅' : (split ? '⇄' : '🏛️')) + '</span>' +
      '<span class="pdxrc-lbl">' +
      escA(rec ? 'Share what the record did'
               : (omni ? 'Share this split ' + noun
                       : (split ? 'Share this split record' : 'Share this ' + noun))) +
      '</span>';
    btn.setAttribute('title', rec
      ? ('Share the record’s own direction on ' + (what || 'this issue') +
         ' as an image — the card prints the counts by direction, a cited example, the ' +
         'dates, the source URLs and how it was judged. No stated position is claimed.')
      : ('Share ' + (what || 'this ' + noun) +
         ' as an image — the card prints the ' + (isVote ? 'bill, the question, the vote' :
           'measure, the kind of act, which way it cut') +
         ', the date, the source URL and how it was judged.'));
    btn.setAttribute('aria-label', rec
      ? 'Share the record’s direction on ' + (what || 'this issue') + ' as an Official Record image'
      : 'Share ' + (what || 'this ' + noun) + ' as an Official Record image');
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
        // arrival:true — this reader followed a shared image and has no page behind
        // the sheet, so it takes the whole viewport on a phone instead of sitting as
        // a short bottom sheet under a band of empty backdrop. Presentation only.
        window.PDXConsistency.openGap(pid, iss, { arrival: true });
        return true;
      }
      if (typeof window.showProfile === 'function') { window.showProfile(pid); return true; }
      return false;
    };
    // The record arrives asynchronously, so an unresolved link retries briefly
    // rather than flashing an empty view — the same contract say-vs-do.js uses.
    if (recordsFor(canonPid(pid)) && open()) { _hashTries = 0; return; }
    if (_hashTries === 0) { try { warm(pid); } catch (e) {} }
    if (_hashTries++ < 10) { setTimeout(function () { handleHash(true); }, 700); return; }
    // Out of retries. If even the last attempt cannot land the reader on a
    // surface, say so — an arrival that silently becomes the front page is the
    // dead link this whole deep-link path exists to prevent.
    if (open()) return;
    try {
      var L = window.PDXShareLinks;
      if (L && typeof L.notice === 'function') {
        L.notice('pdx-record-unresolved', 'Shared record',
          'We couldn’t open the Official Record that link named. Rather than quietly ' +
          'show you the front page, here’s the plain answer: we couldn’t load a record ' +
          'for “' + pid + '” on that issue.');
      }
    } catch (e) {}
  }

  // ── Arrival for the whole-person card ─────────────────────────────────────
  // `#wordrecord=<pid>` — a member id and no issue, because the card named no
  // issue. It opens the member's profile and then their Full Stance Record
  // overlay, which is where the formal-pattern index lives: the page-shaped
  // version of exactly what the card counted, every row with its own pattern
  // tier and its own count beside it. The one thing this must never do is land a
  // reader on a single-issue dossier — a card whose finding is "9 positions
  // compared" opening on one vote would silently narrow its own claim, which is
  // why this shape is routed separately from `#record=<pid>~<issue>` above
  // rather than folded into it.
  //
  // _pdxOpenStanceRecord writes its own `#record/<id>` hash on open, so the
  // address bar ends up naming the surface the reader is actually looking at and
  // the retry loop below stops on its own.
  var _wrHashTries = 0;
  function handleWordRecordHash(retry) {
    var m = (location.hash || '').match(/^#wordrecord=([^~&]+)/);
    if (!m) { _wrHashTries = 0; return; }
    var pid = '';
    try { pid = decodeURIComponent(m[1]); } catch (e) { pid = m[1]; }
    if (!retry) _wrHashTries = 0;
    var open = function () {
      var opened = false;
      if (typeof window.showProfile === 'function') {
        try { window.showProfile(pid); opened = true; } catch (e) {}
      }
      if (typeof window._pdxOpenStanceRecord === 'function') {
        // Deferred behind the profile so the overlay opens over a page rather
        // than over nothing. Presentation only — the surface is the same either
        // way.
        setTimeout(function () {
          try { window._pdxOpenStanceRecord(canonPid(pid) || pid); } catch (e) {}
        }, opened ? 250 : 0);
        opened = true;
      }
      return opened;
    };
    // The record arrives asynchronously and the index is built from it, so an
    // arrival that beats the fetch waits rather than opening an empty overlay —
    // the same contract handleHash() above uses.
    if (recordsFor(canonPid(pid)) && open()) { _wrHashTries = 0; return; }
    if (_wrHashTries === 0) { try { warm(pid); } catch (e) {} }
    if (_wrHashTries++ < 10) { setTimeout(function () { handleWordRecordHash(true); }, 700); return; }
    if (open()) return;
    // Out of retries and nothing to open. Say so, rather than leaving the reader
    // on the front page wondering what the link was for.
    try {
      var L = window.PDXShareLinks;
      if (L && typeof L.notice === 'function') {
        L.notice('pdx-wordrecord-unresolved', 'Shared record check',
          'We couldn’t open the formal record for that link. Rather than quietly ' +
          'show you the front page, here’s the plain answer: we couldn’t load a ' +
          'record for “' + pid + '”.');
      }
    } catch (e) {}
  }

  window.PDXReceiptCards = {
    // reads
    cardsFor: cardsFor,
    contradiction: contradiction,
    consistency: consistency,
    omnibus: omnibus,
    find: find,
    audit: audit,
    // public share gate — the tightened wave-1 allowlist
    publicCardsFor: publicCardsFor,
    publicOmnibus: publicOmnibus,
    publicAudit: publicAudit,
    publicShareBlock: publicShareBlock,
    publicTier: publicTier,
    PUBLIC_MIN_JUDGED: PUBLIC_MIN_JUDGED,
    // ── The record-direction feed ─────────────────────────────────────────
    // Its own entry points, deliberately not folded into the four above: a
    // count taken off cardsFor / publicCardsFor / audit means the same thing
    // after this slice as before it, and a caller that wants the record's own
    // direction asks for it by name.
    recordDirection: recordDirection,
    recordDirectionCardsFor: recordDirectionCardsFor,
    publicRecordDirectionCardsFor: publicRecordDirectionCardsFor,
    recordDirectionCandidates: recordDirectionCandidates,
    recordDirectionAudit: recordDirectionAudit,
    RECORD_DIRECTION_VERDICT: RD_VERDICT,
    RECORD_DIRECTION_SPLIT_LABEL: RD_SPLIT_LABEL,
    RECORD_DIRECTION_ORIGIN: RD_ORIGIN,
    // ── The whole-person words-vs-formal-record card ──────────────────────
    // Named entry points, for the same reason the record-direction feed has
    // its own: this lane must not move any count taken off cardsFor /
    // publicCardsFor / audit, and a caller that wants a tally across a
    // person's issues asks for it by name. `wordRecord` is the public read —
    // it applies the gate; `wordRecordCard` is the ungated build, exposed so a
    // test can assert what the gate catches rather than only that a card
    // passed.
    wordRecord: wordRecord,
    wordRecordCard: wordRecordCard,
    wordRecordRows: wrRows,
    wordRecordTally: wrTally,
    wordRecordAudit: wordRecordAudit,
    WORD_RECORD_ORIGIN: WR_ORIGIN,
    WORD_RECORD_VERDICT: WR_VERDICT,
    WORD_RECORD_MIN_COMPARABLE: WR_MIN_COMPARABLE,
    WORD_RECORD_NOTE: WR_FOOT,
    // Phase 10 (digital share): the two pure text builders that decide what the
    // fact block and the issue chip actually PRINT. Exposed so the presentation
    // tests can assert on the string a reader sees rather than on the source of
    // the function that writes it.
    supportingParts: supportingParts,
    issueMeta: issueMeta,
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
      blockDependentStance: blockDependentStance,
      blockCitation: blockCitation,
      blockUnverifiedCitation: blockUnverifiedCitation,
      unresolvedCitations: UNRESOLVED_CITATIONS,
      blockPlainEffect: blockPlainEffect,
      blockFramedMapping: blockFramedMapping,
      blockHousekeeping: blockHousekeeping,
      publicRationale: publicRationale,
      readerRationale: readerRationale,
      splitSentences: splitSentences,
      blockDuplicateIdentity: blockDuplicateIdentity,
      stableVerdict: stableVerdict,
      wave1Hold: wave1Hold,
      wave1HoldPair: wave1HoldPair,
      blockedMeasureTypes: BLOCKED_MEASURE_TYPES,
      blockedIssueKeys: BLOCKED_ISSUE_KEYS,
      wave1HoldIssueKeys: WAVE1_HOLD_ISSUE_KEYS,
      wave1HoldPairs: WAVE1_HOLD_PAIRS,
      restraintPids: AFP_RESTRAINT_PIDS,
      // The two tripwires the public gate runs over composed copy, exposed so a
      // test can assert what they catch rather than only that a card passed.
      voteWordRe: VOTE_WORD_RE,
      partyFrameRe: PARTY_FRAME_RE,
      // The record-direction feed's own three, plus the composer they run over
      // and the gate that applies them — so a test can assert what each catches
      // rather than only that a card passed.
      rdProportionRe: RD_PROPORTION_RE,
      rdNote: RD_NOTE,
      rdStanceWordRe: RD_STANCE_WORD_RE,
      rdSaydoTokenRe: RD_SAYDO_TOKEN_RE,
      rdBorrowedVerdict: rdBorrowedVerdict,
      rdComposed: rdComposed,
      rdPrinted: rdPrinted,
      rdPublicBlock: rdPublicBlock,
      rdBlockIndex: rdBlockIndex,
      rdStrongest: rdStrongest,
      rdSide: rdSide,
      // The whole-person lane's gate and the two pure pieces it depends on, so
      // a test can ask "would this card leave the app, and why not" directly.
      wrPublicBlock: wrPublicBlock,
      wrComposed: wrComposed,
      wrCircular: wrCircular,
      wrExcludedNote: wrExcludedNote,
      wrFoot: WR_FOOT
    },
    VERDICTS: VERDICTS,
    ACT_VERDICT_LABELS: ACT_VERDICT_LABELS,
    METHOD_URL: METHOD_URL,
    // pure, testable pieces
    canonicalCitation: canonicalCitation,
    // The instrument table and the two functions that read it. A test should be
    // able to ask "what kind of act is this, and what may it claim" without
    // building a card, and to enumerate exactly which instruments this file will
    // let out of the app.
    INSTRUMENTS: INSTRUMENTS,
    instrumentOf: instrumentOf,
    citationFor: citationFor,
    isDisapproval: isDisapproval,
    yeaEffect: yeaEffect,
    tidyRemainder: tidyRemainder,
    proofLine: proofLine,
    splitFor: splitFor,
    candidates: candidates,
    // The split card's two moving parts, exposed for the same reason the guards
    // are: a test should be able to ask "which vote would this side cite, and
    // why was the stronger one refused" directly, rather than inferring it from
    // a finished card.
    strongestCitable: strongestCitable,
    itemBlock: itemBlock,
    // The arrival half of a share. A card's `hash` is what travels; handleHash is
    // what the recipient's browser runs when they tap it. Exposed so
    // scripts/test-receipt-cards.mjs can assert the round trip on the real router
    // — card.hash in, openGap(pid, issue) out, same pid and same issue — instead
    // of trusting that the two halves were written to agree.
    handleHash: handleHash,
    handleWordRecordHash: handleWordRecordHash
  };

  // ONE COPY, UNDER A SHARED NAME. The bill profile's topic ledger needs the same
  // reader's sentence this file computes, and a second implementation of it over
  // there is a second answer to "may a reader see this" — which is how one of the
  // two quietly falls behind. So it is published the way _pdxBigPictureOrder is:
  // a plain window function, taken by whoever needs it, owned here.
  window._pdxReaderRationale = readerRationale;

  function boot() {
    try { bindDelegate(); } catch (e) {}
    try { handleMethodHash(); } catch (e) {}
    try { handleHash(); } catch (e) {}
    try { handleWordRecordHash(); } catch (e) {}
    window.addEventListener('hashchange', function () {
      try { handleMethodHash(); } catch (e) {}
      try { handleHash(); } catch (e) {}
      try { handleWordRecordHash(); } catch (e) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
