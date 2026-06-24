#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 16
//   Facebook evidence, WAVE 3 — sitting Utah State Legislators with NO prior
//   Facebook evidence and among the thinnest overall records
//
// ── WHY THIS WAVE EXISTS ────────────────────────────────────────────────────
//   Waves 13 (rural/single-county members) and 15 (the thinnest freshmen) brought
//   official legislator Facebook pages into the evidence system as a labeled
//   secondary source. This wave continues that work for the next tier: currently
//   SEATED Utah legislators who still had ZERO Facebook items of any kind and,
//   among that group, the thinnest combined evidence (lowest live Firestore
//   `spotlight` + promise density). The thin set was identified by reading every
//   sitting Utah legislator's live record from the public Firestore
//   `politicians` collection, ranking by spotlight + promise density, and
//   filtering to members carrying no Facebook media in index.html.
//
// ── WHAT THIS WAVE DOES ─────────────────────────────────────────────────────
//   DATA ONLY. No render-path change is needed — wave 13 already wired the
//   "facebook" media type end-to-end (glyph 📘, "View Facebook post" label,
//   _pdxIssueBestMedia rank, _pdxEvCounts, Connected-Evidence card). This wave
//   adds eleven Facebook-source Spotlight items to the inline SPOTLIGHT_DATA in
//   index.html, each:
//     • keyed by the SAME roster/Firestore id _issueEvidenceMap reads, so the
//       item joins that member's evidence map. SIX members had no prior
//       SPOTLIGHT_DATA array and are added as new keys; FIVE (lescamilla, aromero,
//       kgrover, jteuscher, rward) already had a curated array, so the Facebook
//       item is appended in place rather than duplicating the key;
//     • carrying an issueKey that matches one of the member's already-tracked
//       stances/promises, so "Stance at a Glance" and Connected Evidence light up
//       with a 📘 link;
//     • impact:'neutral' — context/evidence, not a score-moving driver.
//
// ── STRENGTH GRADING (read before adding more) ──────────────────────────────
//   The Evidence-Strength badge is computed automatically by _strength() in
//   index.html from VERIFIABILITY signals only, NOT from how strong the claim
//   sounds. A Facebook item is classified as a "Social media post" (not an
//   official record), so its ceiling is:
//       +1 direct source link  +1 pinpoint timestamp  +1 tied to a tracked issue
//   = score 3 → "Moderate" (●●○). It can NEVER reach "Strong" (●●●), which is
//   reserved for official floor/committee video and bill records. Every item here
//   therefore grades "Moderate" by construction — nothing overstates a Facebook
//   source. No `media.timestamp` is set, because individual post-level
//   permalinks/dates could not be verified from this environment (pages are
//   auth/JS-gated); the badge stays honest at url + issueKey.
//
// ── SOURCE HONESTY ──────────────────────────────────────────────────────────
//   Each item links the member's WebSearch-verified official or campaign Facebook
//   page (handle + page category confirmed June 2026); the position described is
//   grounded in the member's OWN already-documented record. The ONE exception is
//   Ray Ward, whose official page carries a public, titled VIDEO post whose
//   permalink IS linkable, so that item links the video directly (Facebook video
//   is still graded Moderate). Members checked whose Facebook page could NOT be
//   verified as an official/campaign channel were SKIPPED rather than sourced to a
//   guess: Val Peterson, Katy Hall, Don Ipson, Evan Vickers, Todd Weiler. Sandra
//   Hollins and Karianne Lisonbee were skipped as conservative calls (Hollins is
//   not seeking reelection and her only page references a former district;
//   Lisonbee is leaving her House seat for a congressional run and her active
//   channel has moved). Jen Plumb was skipped because no dedicated official or
//   campaign page could be confirmed — her Facebook presence runs through the
//   caucus page.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL member's own record and
// own words — never their party.
//
//   node scripts/spotlight-evidence-facebook-thinnest-jun2026-wave16.mjs            # audit
//   node scripts/spotlight-evidence-facebook-thinnest-jun2026-wave16.mjs --patch    # audit (data is hand-applied; no-op)
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';

const HTML = 'index.html';

// roster id → { issueKey, page, note }. The page/handle and its category were
// WebSearch-verified June 2026; each issueKey matches a tracked stance/promise.
const FB_ITEMS = {
  karen_kwan:      { issueKey: 'public_schools', page: 'facebook.com/RepKarenKwan',                note: 'Official "Senator Karen Kwan: UT SD 12" page (Politician)' },
  verona_mauga:    { issueKey: 'econ_smallbiz',  page: 'facebook.com/p/Vote-Verona-Mauga',         note: 'Campaign "Vote Verona Mauga" page' },
  andrew_stoddard: { issueKey: 'justice_balance',page: 'facebook.com/voteandrewstoddard',          note: 'Campaign "Rep. Andrew Stoddard" page' },
  doug_owens:      { issueKey: 'water',          page: 'facebook.com/DougOwensUtah',               note: 'Official "Doug Owens" page' },
  wharper:         { issueKey: 'transit',        page: 'facebook.com/WayneHarperUtahSenate16',     note: 'Official "Wayne Harper - Utah State Senator" page' },
  cpierucci:       { issueKey: 'school_choice',  page: 'facebook.com/RepCandicePierucci',          note: 'Official "Representative Candice B. Pierucci" page' },
  // appended into pre-existing curated arrays
  lescamilla:      { issueKey: 'healthcare',     page: 'facebook.com/Luzforutah',                  note: 'Official "Senator Luz Escamilla" page (appended)' },
  aromero:         { issueKey: 'justice_reform', page: 'facebook.com/RepAngelaRomero',             note: 'Official "Representative Angela Romero" page (appended)' },
  kgrover:         { issueKey: 'edu_balance',    page: 'facebook.com/KeithGroverUT',               note: 'Official "Keith Grover" page (appended)' },
  jteuscher:       { issueKey: 'tech_balance',   page: 'facebook.com/jordanforutah',               note: 'Official "Representative Jordan Teuscher" page (appended)' },
  rward:           { issueKey: 'healthcare',     page: 'facebook.com/raywardutah (video)',         note: 'Official "Ray Ward - Utah House District 19" page video (appended)' },
};

function audit() {
  const html = readFileSync(HTML, 'utf8');
  let present = 0, missing = 0;
  for (const [id, it] of Object.entries(FB_ITEMS)) {
    const here = html.includes('          ' + id + ': [') &&
      html.includes("issueKey:'" + it.issueKey + "', impact:'neutral', category:'statement', tags:['Public Statements'], sourceType:'facebook_post'");
    if (here) present++; else missing++;
    console.log(`${here ? '✓' : '✗'} ${id.padEnd(18)} #${it.issueKey.padEnd(16)} — ${it.note}`);
  }
  console.log('\n──────── wave 16 summary ────────');
  console.log(`Facebook-source items present : ${present} / ${Object.keys(FB_ITEMS).length}`);
  console.log('media type "facebook" wired   :', /facebook: \{ g: '📘'/.test(html) ? 'yes (wave 13)' : 'NO');
  if (missing) console.log(`MISSING (re-apply by hand)    : ${missing}`);
  console.log('All items grade "Moderate" by design (social link + tracked issue; never "Strong").');
}

audit();
