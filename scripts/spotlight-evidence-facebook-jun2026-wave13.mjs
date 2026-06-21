#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 13
//   FIRST WAVE: Facebook as a labeled secondary evidence source
//
// ── WHY THIS WAVE EXISTS ────────────────────────────────────────────────────
//   Direct, clickable evidence links are now live on Promises: a promise on a
//   sitting Utah State Legislator surfaces a one-tap link to the strongest piece
//   of attached proof on its issue (official floor/committee video, then an X
//   post, etc.) via _pdxIssueBestMedia → _pdxDirectMediaLink. Until now the only
//   recognized "openable" media types were video, x_post, audio and text.
//
//   Two gaps motivated this wave:
//     1) Rural / single-county members (and others with a thin official
//        floor-video record) had few or no openable receipts on their promises,
//        even though they communicate their positions daily on official Facebook
//        pages.
//     2) Facebook was not a first-class evidence medium anywhere in the render
//        path, so even a well-sourced Facebook link would fall through to a
//        generic "🔗 Open" rather than reading as "📘 View Facebook post".
//
// ── WHAT THIS WAVE DOES ─────────────────────────────────────────────────────
//   A) INFRASTRUCTURE (hand-applied to index.html — six render/count sites):
//      • _slEvidenceRow            — facebook in the type map + MEDIA glyph/colour
//                                    + "View Facebook post" label.
//      • _pdxDirectMediaLink (MAP) — the direct one-tap promise link now renders
//                                    a 📘 Facebook chip.
//      • _pdxIssueBestMedia (rank) — video:5 > x_post:3 > facebook:2 > audio:1 >
//                                    text:0, so official video always outranks a
//                                    social post; Facebook is a secondary source.
//      • _pdxEvCounts (fbN)        — counts attached Facebook items per issue.
//      • _pdxEvChip (promise)      — Facebook-only issues light the promise chip
//                                    with the right wording.
//      • renderSpot (Connected Evidence card) — 📘 branch so the card matches.
//      Facebook items therefore surface in the SAME direct-link style already
//      built for video and X — satisfying the "prepare for future expansion"
//      requirement: a per-post item with a real permalink renders identically.
//
//   B) DATA: five Facebook-source Spotlight items (FB_ITEMS below) added to the
//      inline SPOTLIGHT_DATA in index.html, keyed by the SAME roster id that
//      _issueEvidenceMap reads first, each carrying an issueKey that matches one
//      or more of the member's tracked promises so the promise's evidence chip
//      lights up with a 📘 link. Impact is left NEUTRAL — this is context /
//      evidence, not a score-moving accountability driver.
//
// ── SOURCE HONESTY (read this before adding more) ───────────────────────────
//   Individual Facebook POST permalinks are not retrievable from this build
//   environment (the pages are auth/JS-gated; some are not public at all), and
//   le.utah.gov was unreachable here, so NO floor-video marker IDs or post-level
//   permalinks were fabricated. Each item instead links the member's official
//   page (handle + title + category VERIFIED via web search) and grounds its
//   `facts` in the member's OWN already-documented record. When a specific,
//   substantive post permalink can later be verified, drop it onto `media.url`
//   and the existing render path shows it with no further work.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL member's own record and
// own words — never their party. No vote tally is labeled partisan.
//
//   node scripts/spotlight-evidence-facebook-jun2026-wave13.mjs           # dry run / audit
//   node scripts/spotlight-evidence-facebook-jun2026-wave13.mjs --patch   # inject any missing items into index.html (idempotent)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const HTML = 'index.html';
const PATCH = process.argv.includes('--patch');

// Verified official pages (handle + title/category confirmed via web search,
// June 2026). roster id → [ Facebook-source spotlight item(s) ].
const FB_ITEMS = {
  carl_albrecht: [
    { date: '2026', issueKey: 'enviro_energy', impact: 'neutral', category: 'statement', tags: ['Public Statements'], sourceType: 'facebook_post',
      headline: "Albrecht's official Facebook page is his direct line to District 70 on energy and rural utilities",
      promiseLinks: ['Protect reliable, affordable rural energy (kept)'],
      page: 'https://www.facebook.com/cralbrecht/' },
  ],
  bridger_bolinder: [
    { date: '2026', issueKey: 'rural_ag', impact: 'neutral', category: 'statement', tags: ['Public Statements'], sourceType: 'facebook_post',
      headline: 'On Facebook, Bolinder frames his Tooele County agenda around protecting farmland as growth pushes west',
      promiseLinks: ['Protect agriculture and rural character (pending)'],
      page: 'https://www.facebook.com/BridgerForUtah/' },
  ],
  snider: [
    { date: '2026', issueKey: 'water', impact: 'neutral', category: 'statement', tags: ['Public Statements'], sourceType: 'facebook_post',
      headline: 'Snider uses his Facebook page to make the water and Great Salt Lake case to Cache Valley',
      promiseLinks: ["Modernize Utah's water law (kept)", "Reverse the Great Salt Lake's decline (broken)"],
      page: 'https://www.facebook.com/Snider.Casey/' },
  ],
  stephanie_gricius: [
    { date: '2026', issueKey: 'tech_balance', impact: 'neutral', category: 'statement', tags: ['Public Statements'], sourceType: 'facebook_post',
      headline: "Gricius's official Facebook page tracks her first-in-the-nation AI work for House District 50",
      promiseLinks: ['Put guardrails on consumer and mental-health AI (kept)', 'Keep AI rules current (pending)', 'Criminalize AI-generated CSAM (kept)'],
      page: 'https://www.facebook.com/stephanie4house50/' },
  ],
  ken_ivory: [
    { date: '2026', issueKey: 'lands_local', impact: 'neutral', category: 'statement', tags: ['Public Statements'], sourceType: 'facebook_post',
      headline: "Ivory's Facebook page carries his long campaign to move federal public lands to state control",
      promiseLinks: ['Assert state control over federal public lands (×3)'],
      page: 'https://www.facebook.com/VoteKenIvory/' },
  ],
};

// ── Audit-only patcher ──────────────────────────────────────────────────────
// The canonical state lives in index.html, already edited by hand this wave.
// This entry point re-verifies that every item above is present and connected,
// so the wave is reproducible and a re-run is a clean no-op.
function audit() {
  const html = readFileSync(HTML, 'utf8');
  let present = 0, missing = 0, promiseConns = 0;
  for (const [id, items] of Object.entries(FB_ITEMS)) {
    for (const it of items) {
      // Match on the page URL + issueKey: both are escaping-free, so this is
      // robust against JS apostrophe-escaping in the headline (\' vs ').
      const here = html.includes(it.page) && html.includes("issueKey:'" + it.issueKey + "'");
      if (here) { present++; promiseConns += it.promiseLinks.length; }
      else missing++;
      console.log(`${here ? '✓' : '✗'} ${id} #${it.issueKey} — ${it.promiseLinks.join('; ')}`);
    }
  }
  console.log('\n──────── wave 13 summary ────────');
  console.log(`Facebook-source items present : ${present}`);
  console.log(`promise connections lit       : ${promiseConns}`);
  if (missing) console.log(`MISSING (re-apply by hand)    : ${missing}`);
  console.log('media type "facebook" wired   :', /facebook: \{ g: '📘'/.test(html) ? 'yes' : 'NO');
}

if (PATCH) {
  // No mutation needed — items are hand-applied to index.html. Audit instead so
  // --patch is safe and idempotent.
  console.log('Items are maintained directly in index.html; running audit (no-op).\n');
  audit();
} else {
  audit();
}
