#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 15
//   Facebook evidence, WAVE 2 — the THINNEST sitting Utah State Legislators
//
// ── WHY THIS WAVE EXISTS ────────────────────────────────────────────────────
//   Wave 13 brought official legislator Facebook pages into the evidence system
//   as a labeled secondary source (rural / single-county members). This wave
//   continues that work, but targets the members who still had the THINNEST
//   overall evidence records of any CURRENTLY SEATED legislator — the lowest
//   combined Spotlight + promise counts, and zero prior Facebook items. The thin
//   set was identified by reading every sitting Utah legislator's live record
//   (Firestore `politicians` collection) and ranking by spotlight + promise
//   density; the bottom cluster is targeted here.
//
// ── WHAT THIS WAVE DOES ─────────────────────────────────────────────────────
//   DATA ONLY. No render-path change is needed — wave 13 already wired the
//   "facebook" media type end-to-end (glyph 📘, "View Facebook post" label,
//   _pdxIssueBestMedia rank, _pdxEvCounts, Connected-Evidence card). This wave
//   adds seven Facebook-source Spotlight items to the inline SPOTLIGHT_DATA in
//   index.html, each:
//     • keyed by the SAME roster/Firestore id _issueEvidenceMap reads, so the
//       item joins that member's evidence map;
//     • carrying an issueKey that matches one of the member's already-tracked
//       promises, so "Stance at a Glance" and Connected Evidence light up with a
//       📘 link;
//     • impact:'neutral' — context/evidence, not a score-moving driver.
//
// ── STRENGTH GRADING (read before adding more) ──────────────────────────────
//   The Evidence-Strength badge is computed automatically by _strength() in
//   index.html from VERIFIABILITY signals only, NOT from how strong the claim
//   sounds. A Facebook item is classified as a "Social media post" (not an
//   official record), so its ceiling is:
//       +1 direct source link  +1 pinpoint timestamp  +1 tied to a tracked issue
//   = score 3 → "Moderate" (●●○). It can NEVER reach "Strong" (●●●), which is
//   reserved for official floor/committee video and bill records. Every item
//   here therefore grades "Moderate" by construction — nothing overstates a
//   Facebook source. No `media.timestamp` is set, because individual post-level
//   permalinks/dates could not be verified from this environment (see below);
//   the badge stays honest at url + issueKey.
//
// ── SOURCE HONESTY ──────────────────────────────────────────────────────────
//   Individual Facebook POST permalinks are not retrievable from this build
//   environment (pages are auth/JS-gated). Each item links the member's
//   WebSearch-verified official or campaign page (handle + page category
//   confirmed June 2026); the position described is grounded in the member's OWN
//   already-documented record. The ONE exception is Mike Petersen, whose page
//   carries a public, titled VIDEO post whose permalink IS linkable, so that
//   item links the video directly (Facebook video is still graded Moderate).
//   Members checked whose Facebook page could NOT be verified were SKIPPED
//   rather than sourced to a guess: Kristen Chevrier (X only), Kay Christofferson,
//   Stewart Barlow, Emily Buss, Jon Hawkins. Leah Hansen is included with an
//   explicit note that hers is a personal public-figure profile, not an official
//   office page — accepted because it is clearly self-authored and she uses it as
//   her primary constituent channel (announced her 2026 reelection there).
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL member's own record and
// own words — never their party.
//
//   node scripts/spotlight-evidence-facebook-thinnest-jun2026-wave15.mjs            # audit
//   node scripts/spotlight-evidence-facebook-thinnest-jun2026-wave15.mjs --patch    # audit (data is hand-applied; no-op)
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';

const HTML = 'index.html';

// roster id → { issueKey, page, promiseLink }. The page/handle and its category
// were WebSearch-verified June 2026; each issueKey matches a tracked promise.
const FB_ITEMS = {
  jake_sawyer:       { issueKey: 'housing_support',   page: 'facebook.com/people/Representative-Jake-Sawyer', promise: 'Champion housing affordability and ease development barriers' },
  rosalba_dominguez: { issueKey: 'family_support',    page: 'facebook.com/VoteRosalbaDominguez',              promise: 'Create a state Diapering Supplies Fund for families in need' },
  mike_petersen:     { issueKey: 'democracy_balance', page: 'facebook.com/restoreyourvoiceutah (video)',      promise: "Strengthen voter-roll maintenance and election administration" },
  grant_miller:      { issueKey: 'justice_balance',   page: 'facebook.com/grantmiller24',                     promise: 'Reform how courts reduce criminal fines for low-income defendants' },
  matt_macpherson:   { issueKey: 'gun_rights',        page: 'facebook.com/UtahVote4Matt',                     promise: 'Return seized firearms to lawful owners (HB195, 2025)' },
  jake_fitisemanu:   { issueKey: 'healthcare',        page: 'facebook.com/JakeForUT',                         promise: 'Expand access to Medicare supplement insurance options' },
  leah_hansen:       { issueKey: 'property_tax',      page: 'facebook.com/leah.t.hansen (personal profile)',  promise: 'Tighten public notice before property-tax increases (Truth in Taxation)' },
};

function audit() {
  const html = readFileSync(HTML, 'utf8');
  let present = 0, missing = 0;
  for (const [id, it] of Object.entries(FB_ITEMS)) {
    const here = html.includes('          ' + id + ': [') && html.includes("issueKey:'" + it.issueKey + "'");
    if (here) present++; else missing++;
    console.log(`${here ? '✓' : '✗'} ${id.padEnd(20)} #${it.issueKey.padEnd(18)} — ${it.promise}`);
  }
  console.log('\n──────── wave 15 summary ────────');
  console.log(`Facebook-source items present : ${present} / ${Object.keys(FB_ITEMS).length}`);
  console.log('media type "facebook" wired   :', /facebook: \{ g: '📘'/.test(html) ? 'yes (wave 13)' : 'NO');
  if (missing) console.log(`MISSING (re-apply by hand)    : ${missing}`);
  console.log('All items grade "Moderate" by design (social link + tracked issue; never "Strong").');
}

audit();
