#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-spotlight-index.mjs — build /spotlight-index.js from /spotlights-data.js
//
// WHY THIS FILE EXISTS
// spotlights-data.js is ~1.2 MB: 60 long-form curated writeups, each with a
// sourced timeline, evidence groups, case-for / case-against, and a roster of
// people with their stance on the issue. That is the right payload for
// /issue/<slug> — it IS the page. It is the wrong payload for the front door,
// which never renders a single one of those bodies: the homepage only ever
// needs a slug, a title, a place, a one-line blurb, a couple of issue keys and
// the documentation-strength badge. So the homepage gets this index instead,
// and /issue/<slug> (spotlight.html) gets the corpus.
//
// Everything here is DERIVED — no editorial content is authored in this file
// and nothing is invented. `st` is spotlightStrength() from spotlight-engine.js
// reproduced exactly (same thresholds, same labels), precomputed at generate
// time because the homepage no longer ships the engine that computed it.
// `byPerson` is forPolitician()'s scan, inverted: it looks in the same four
// places (groups.people, standsOnIssue.people, evidence.items, sayVsDo.person)
// so a profile callout still finds the Spotlights that feature that person
// without the front page holding 1,260 roster rows to find them in.
//
// scripts/test-spotlight-shell.mjs regenerates this in memory and fails if the
// committed file differs, so the index cannot drift from the corpus.
//
// Usage: node scripts/gen-spotlight-index.mjs [--check]
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'spotlight-index.js');

export function loadSpotlights(root = ROOT) {
  const src = readFileSync(join(root, 'spotlights-data.js'), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win.SPOTLIGHTS || {};
}

// Verbatim logic from spotlightStrength() in spotlight-engine.js.
function strengthOf(sp) {
  const sources = (sp.timeline || []).filter((t) => t && t.src && t.src.url).length;
  let receipts = 0, strong = 0;
  (sp.evidence || []).forEach((grp) => {
    (grp.items || []).forEach((it) => { receipts++; if ((it.strength || '') === 'strong') strong++; });
  });
  let level, label;
  if (strong >= 3 && sources >= 4) { level = 'strong'; label = 'Strongly documented'; }
  else if (receipts + sources >= 5) { level = 'strong'; label = 'Well documented'; }
  else if (receipts + sources >= 2) { level = 'moderate'; label = 'Documented'; }
  else { level = 'limited'; label = 'Emerging'; }
  return { receipts, strong, sources, level, label };
}

// Verbatim place-list from forPolitician() in spotlight-engine.js.
function peopleIn(sp) {
  const out = new Set();
  (sp.groups || []).forEach((g) => (g.people || []).forEach((p) => { if (p && p.id) out.add(p.id); }));
  if (sp.standsOnIssue) ((sp.standsOnIssue.people) || []).forEach((p) => { if (p && p.id) out.add(p.id); });
  (sp.evidence || []).forEach((g) => (g.items || []).forEach((it) => { if (it && it.id) out.add(it.id); }));
  (sp.sayVsDo || []).forEach((r) => { if (r && r.person) out.add(r.person); });
  return [...out];
}

export function buildIndex(SPOT) {
  const slugs = Object.keys(SPOT);
  const rows = slugs.map((slug) => {
    const sp = SPOT[slug];
    const soi = sp.standsOnIssue || null;
    const mk = [];
    if (soi) {
      if (soi.libraryKey) mk.push(soi.libraryKey);
      (soi.matchIssueKeys || []).forEach((k) => { if (k && mk.indexOf(k) === -1) mk.push(k); });
    }
    const row = {
      slug: slug,
      title: sp.title || '',
      eyebrow: sp.eyebrow || '',
      place: sp.place || '',
      updated: sp.updated || '',
      blurb: sp.blurb || sp.metaDescription || sp.summary || '',
      searchKeywords: sp.searchKeywords || '',
      primaryIssueKey: sp.primaryIssueKey || '',
      communityIssueKeys: sp.communityIssueKeys || [],
      st: strengthOf(sp)
    };
    if (mk.length) row.standsIssueKeys = mk;
    return row;
  });
  const byPerson = {};
  slugs.forEach((slug, i) => {
    peopleIn(SPOT[slug]).forEach((id) => { (byPerson[id] = byPerson[id] || []).push(i); });
  });
  return { rows, byPerson };
}

export function render({ rows, byPerson }) {
  const head = readFileSync(join(ROOT, 'scripts', 'spotlight-index.head.js'), 'utf8');
  const body =
    '  var ROWS = ' + JSON.stringify(rows, null, 0).replace(/},{/g, '},\n    {') + ';\n\n' +
    '  var BY_PERSON = ' + JSON.stringify(byPerson, null, 0).replace(/,"/g, ',\n    "') + ';\n';
  return head.replace('/* @@ROWS@@ */\n', body);
}

const argv = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = render(buildIndex(loadSpotlights()));
  if (argv.includes('--check')) {
    const have = readFileSync(OUT, 'utf8');
    if (have !== out) { console.error('spotlight-index.js is STALE — re-run without --check'); process.exit(1); }
    console.log('spotlight-index.js is in sync (' + out.length + ' bytes)');
  } else {
    writeFileSync(OUT, out);
    console.log('wrote spotlight-index.js — ' + out.length + ' bytes');
  }
}
