#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — add/repair politician headshots in the live Firestore roster
//
// A roster review found high-visibility cards rendering the generic silhouette
// placeholder because their `photo` field was either empty or pointed at a URL
// that no longer resolves (HTTP 404). index.html reads the `photo` field of the
// `politicians` collection at runtime for both the compact cards and the full
// profile modal, so setting this single field fixes every view.
//
//   node scripts/add-missing-photos.mjs            # dry run (default)
//   node scripts/add-missing-photos.mjs --apply    # write to Firestore
//
// Scope (verified, public/official portraits only):
//   • rfkjr        — repair. Stored Wikimedia URL 404s; replaced with the
//                    current official 2025 HHS portrait on Wikimedia Commons.
//   • nhaley       — repair. Stored Wikimedia URL 404s (file re-hashed);
//                    replaced with the current official photo on Commons.
//   • fgibson      — add. Former Utah House Speaker / 2021 Lt. Gov candidate.
//                    Official Utah legislature photo was removed when he left
//                    office, so his Wikimedia Commons portrait is used.
//   • rwood        — add. Troy Walker, Mayor of Draper — Wikimedia Commons.
//   • logan_monson — add. Sitting Utah Representative (House District 69);
//                    official Utah legislature portrait (code MONSOL).
//
// Every URL below was confirmed to return HTTP 200 image/* before commit.
// The script sets only `photo` (+ `updatedAt`) via updateMask; re-running is safe.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-10T00:00:00.000Z';

// ── Firestore value encoder ────────────────────────────────────────────────
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

// ── Photo table ────────────────────────────────────────────────────────────
const PLAN = [
  {
    id: 'rfkjr',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29_%28b%29.jpg/500px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29_%28b%29.jpg',
  },
  {
    id: 'nhaley',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Nikki_Haley_official_photo.jpg/500px-Nikki_Haley_official_photo.jpg',
  },
  {
    id: 'fgibson',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Francis_Gibson_%282021%29_%28cropped%29.jpeg',
  },
  {
    id: 'rwood',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Troy_Walker_wiki.jpg/500px-Troy_Walker_wiki.jpg',
  },
  {
    id: 'logan_monson',
    photo: 'https://le.utah.gov/images/legislator/MONSOL.jpg',
  },
];

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  return r.json();
}

async function patch(id, fields) {
  const mask = Object.keys(fields);
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — add/repair photos  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let done = 0;
  for (const plan of PLAN) {
    let doc;
    try {
      doc = await getDoc(plan.id); // confirm the record exists before writing
    } catch (e) {
      console.log(`  ✗ ${plan.id}: ${e.message}`);
      continue;
    }
    const name = doc.fields?.name?.stringValue || plan.id;
    console.log(`  ${APPLY ? '✎' : '→'} ${plan.id} (${name}): set photo`);
    if (APPLY) await patch(plan.id, { photo: plan.photo, updatedAt: STAMP });
    done++;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${done} photo update(s).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
