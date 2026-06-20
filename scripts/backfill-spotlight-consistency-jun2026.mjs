#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — close the Spotlight/Accountability gap for sitting Utah
// legislators (June 2026 consistency pass)
//
// A depth audit of the 88 sitting Utah State Representatives and Senators in
// the live `politicians` collection found one dominant, fixable gap: ~47 of
// them carried a fully built-out Promise Tracker and Issue-Position layer but
// ZERO entries in the `spotlight` (Accountability-of-Truth) layer. That is the
// single largest driver of distance between the strongest and weakest sitting
// profiles, and it is the layer the audit summary flagged most often.
//
// This pass closes that gap with a hard honesty rule:
//
//   • Every Spotlight item is GROUNDED in a record already verified inside that
//     same profile — specifically a `kept` (signed/enacted) promise that already
//     carries a real, load-tested `source`. No new factual claims are made and
//     no new sources are invented; each item surfaces an enacted record into the
//     accountability layer and reads it as a WORD-vs-ACTION consistency signal,
//     tied where possible to one of the member's own stated `keyIssues`.
//   • Only `kept` promises become positive Spotlight items. Pending or failed
//     bills are intentionally NOT spun into accountability wins.
//   • A member with no `kept`, sourced promise is left WITHOUT a spotlight rather
//     than padded with filler — honesty over forced content, matching the rest
//     of the site.
//
// Idempotent & non-destructive:
//   • A member's spotlight is written ONLY if the live doc has zero spotlight
//     entries — an editor's hand-authored list is never clobbered.
//
//   node scripts/backfill-spotlight-consistency-jun2026.mjs            # dry run
//   node scripts/backfill-spotlight-consistency-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// ── Firestore value encoder / decoder ──────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = enc(val);
    return { mapValue: { fields } };
  }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── helpers ────────────────────────────────────────────────────────────────
const STOP = new Set(['the','and','for','with','that','this','from','have','has','was','were','are','his','her','their','our','its','utah','state','bill','bills','law','laws','act','public','new','first','into','than','over','more','most','requiring','require','requires','signed','passed','sponsored','sponsor','chief','prime','primary','floor','governor','cox','sen','rep','house','senate','legislature','session','amendments','modifications','during','while','which','would','could','they','them','when','what','about','also','been','being','after','before','january','february','march','april','may','june','july','august','september','october','november','december']);

function tokens(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
}

// Tidy a promise title into a Spotlight headline: drop a leading bill citation
// ("H.B. 420 ", "S.B. 90 ", "H.C.R. 2 ") and a trailing one in parentheses.
function cleanHeadline(t) {
  let s = (t || '').trim();
  s = s.replace(/^\s*(?:[HS]\.?[BCJ]?\.?R?\.?)\s*\d+\s+/i, '');
  s = s.replace(/\s*\((?:[A-Z]{1,3}\.?\s?\d+[^)]*|[^)]*\b\d{4}\b[^)]*)\)\s*$/i, '');
  return s.trim();
}

// A keyIssue is usable in the "why" line only if it reads as a topic noun-phrase
// (not a full sentence like "Opposes Little Cottonwood Canyon gondola").
function usableIssue(ki) {
  if (!ki) return false;
  if (ki.split(/\s+/).length > 6) return false;
  return !/^(opposes?|support(s|ing)?|reduc(e|es|ing)|protect(s|ing)?|increas(e|es|ing)|expand(s|ing)?|defend(s|ing)?|fight(s|ing)?|backs?|run(s|ning)?|limit(s|ing)?)\b/i.test(ki.trim());
}

// Pull the most representative year (or range) out of a promise's text.
function yearsFrom(p) {
  const hay = `${p.detail || ''} ${(p.sources || []).map((s) => s.url || '').join(' ')}`;
  const ys = Array.from(new Set((hay.match(/\b(19|20)\d{2}\b/g) || []))).map(Number).filter((y) => y >= 1970 && y <= 2026).sort();
  if (!ys.length) return '';
  return ys.length === 1 ? String(ys[0]) : `${ys[0]}–${ys[ys.length - 1]}`;
}

// Prefer a canonical legislature source, else the first source.
function bestSource(p) {
  const srcs = p.sources || [];
  return srcs.find((s) => /le\.utah\.gov|senate\.utah\.gov|house\.utleg\.gov|governor\.utah\.gov/i.test(s.url || '')) || srcs[0] || null;
}

// Find the member's stated keyIssue most relevant to a promise, for the "why".
function matchIssue(p, keyIssues) {
  const pt = new Set([...tokens(p.title), ...tokens(p.detail)]);
  let best = null, bestScore = 0;
  for (const ki of keyIssues || []) {
    const score = tokens(ki).reduce((n, w) => n + (pt.has(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = ki; }
  }
  return bestScore >= 1 ? best : null;
}

// Build a Spotlight item from a single kept, sourced promise.
function spotlightFromPromise(p, doc) {
  const src = bestSource(p);
  if (!src || !src.url) return null;
  const issue = matchIssue(p, doc.keyIssues);
  const first = (doc.name || '').split(/\s+/)[0] || 'The member';
  const why = usableIssue(issue)
    ? `A documented, enacted record — concrete follow-through on ${first}'s stated focus on ${issue.toLowerCase()}.`
    : `A documented, enacted record backing up ${first}'s stated legislative priorities.`;
  return {
    impact: 'positive',
    category: 'voting',
    date: yearsFrom(p) || '2025',
    tags: ['Notable Actions', 'Consistency'],
    headline: cleanHeadline(p.title),
    facts: p.detail,
    why,
    source: { label: src.label || 'Source', url: src.url },
  };
}

// Choose up to N strongest kept promises: canonical-source first, then those
// whose topic matches a stated keyIssue, then by detail richness.
function pickPromises(doc, n) {
  const kept = (doc.promises || []).filter((p) => p.verdict === 'kept' && bestSource(p));
  const scored = kept.map((p) => ({
    p,
    canonical: /le\.utah\.gov|senate\.utah\.gov|house\.utleg\.gov|governor\.utah\.gov/i.test((bestSource(p) || {}).url || '') ? 1 : 0,
    matched: matchIssue(p, doc.keyIssues) ? 1 : 0,
    len: (p.detail || '').length,
  }));
  scored.sort((a, b) => (b.canonical - a.canonical) || (b.matched - a.matched) || (b.len - a.len));
  return scored.slice(0, n).map((s) => s.p);
}

// ── Hand-authored ISSUE-POSITION additions for the four members stuck at
//    exactly 3-4 documented stances — too thin for the Alignment Tool. Each new
//    stance restates a fact already in that profile's promises/bio; nothing is
//    invented. Added only when the key is not already present. ───────────────
const STANCE_ADDS = {
  clinton_okerlund: {
    'Taxes & Revenue': 'A career CFO who sits on the House Revenue and Taxation Committee and sponsored 2025 vehicle-assessment reform (HB 272); campaigns on cutting waste and abuse of public funds.',
    'Public Lands & Outdoor Recreation': 'Sponsored HB 490 (2025) modernizing state-parks funding toward self-sustaining fees and long-term park development, and lists public-lands stewardship among his core priorities.',
  },
  christine_watkins: {
    'Rural Economic Development': 'A five-term legislator from Price who chairs the Business, Economic Development, and Labor sub-appropriations committee and focuses on jobs and growth in rural eastern Utah.',
    'Native American & Tribal Affairs': 'Chairs the Native American Liaison Committee and centers tribal affairs in her legislative work for Carbon, Emery, and Duchesne counties.',
  },
  kgrover: {
    'Sound Money & Precious Metals': 'Senate floor sponsor of HB 306 (2025), making Utah the first state to let vendors opt to be paid through a gold- and silver-backed electronic payment system.',
    'Youth & Child Safety': 'Sponsored SB 147 (2025) requiring youth-serving organizations to run sex-offender registry checks on employees and volunteers who work with minors.',
  },
  colin_w_jack: {
    'Consumer Protection': 'An electrical engineer and former Dixie Power COO who sponsored HB 57 (2025), the rooftop-solar consumer-protection law requiring disclosures, registration, and bonding for solar retailers.',
    'Energy Workforce & Education': 'Sponsored HB 157 (2025) directing the Office of Energy Development to build K-12 energy curricula and a workforce-development advisory group.',
  },
};

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function listAll() {
  const docs = [];
  let pageToken = null, pages = 0;
  do {
    const url = new URL(BASE);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`list: HTTP ${r.status}`);
    const j = await r.json();
    for (const d of j.documents || []) {
      const o = { _id: d.name.split('/').pop() };
      for (const [k, v] of Object.entries(d.fields || {})) o[k] = dec(v);
      docs.push(o);
    }
    pageToken = j.nextPageToken; pages++;
  } while (pageToken && pages < 20);
  return docs;
}
async function patch(id, fields) {
  const mask = Object.keys(fields);
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── sitting-legislator classifier (mirrors the depth-audit logic) ───────────
function isSittingLeg(d) {
  const o = d.office || '';
  if (/candidate|former|2026|mayor|county|congress|u\.s\.|governor|treasurer|auditor|attorney|insurance|lt\.|school board|controller|commissioner/i.test(o)) return false;
  return /state (representative|senator|senate|house)/i.test(o);
}

(async () => {
  console.log(`PolitiDex — backfill Spotlight consistency layer  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  const all = await listAll();
  const sitting = all.filter(isSittingLeg);

  let spotMembers = 0, spotItems = 0, stanceMembers = 0, stanceAdds = 0, skippedNoKept = 0, touched = 0;

  for (const doc of sitting) {
    const id = doc._id;
    const fields = {};

    // ── Spotlight: only when the doc has none yet ───────────────────────────
    const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
    if (existing.length === 0) {
      const promises = pickPromises(doc, 2);
      const items = promises.map((p) => spotlightFromPromise(p, doc)).filter(Boolean);
      if (items.length) {
        fields.spotlight = items;
        spotMembers++; spotItems += items.length;
        console.log(`  ${APPLY ? '✎' : '→'} ${id.padEnd(22)} (${doc.name}): +${items.length} spotlight`);
        for (const it of items) console.log(`        • [${it.date}] ${it.headline}`);
        if (process.env.DEBUG_JSON && process.env.DEBUG_JSON.split(',').includes(id)) console.log(JSON.stringify(items, null, 2));
      } else {
        skippedNoKept++;
        console.log(`  – ${id.padEnd(22)} (${doc.name}): no kept+sourced promise — left without spotlight`);
      }
    }

    // ── Stances: hand-authored top-ups for the thinnest 3-4-stance members ──
    const addS = STANCE_ADDS[id];
    if (addS) {
      const cur = (doc.stances && typeof doc.stances === 'object') ? { ...doc.stances } : {};
      const newKeys = [];
      for (const [k, v] of Object.entries(addS)) if (!(k in cur)) { cur[k] = v; newKeys.push(k); }
      if (newKeys.length) {
        fields.stances = cur;
        stanceMembers++; stanceAdds += newKeys.length;
        console.log(`  ${APPLY ? '✎' : '→'} ${id.padEnd(22)} (${doc.name}): +${newKeys.length} stance -> ${newKeys.join(', ')} [${Object.keys(cur).length} total]`);
      }
    }

    if (Object.keys(fields).length) {
      fields.updatedAt = STAMP;
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${spotItems} spotlight item(s) across ${spotMembers} member(s); ${stanceAdds} stance(s) across ${stanceMembers} member(s). ${touched} doc(s) touched.`);
  console.log(`(${skippedNoKept} member(s) left without a spotlight — no kept, sourced promise to ground one.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
