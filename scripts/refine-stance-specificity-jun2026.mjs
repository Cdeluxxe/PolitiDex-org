#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 STANCE-KEY SPECIFICITY pass (spotlight alignment)
//
// Companion to the index.html Issue-Position / Promise key refinements made in
// the same pass. The evidence view (window._issueEvidenceMap) forms a full
// three-layer connection when ONE issueKey is shared by the position
// (ISSUE_STANCE_DATA), a promise (roster) AND a Spotlight item. For several
// current sitting Utah legislators the position + promise already shared a
// SPECIFIC key, while the matching Spotlight item — authored in an earlier wave
// from the member's OWN bill/record — was left untagged (or, for Eliason,
// carried the broad `healthcare` key the rest of his record has now been
// refined off of). Aligning each Spotlight's issueKey to the specific key the
// member's stance + promise already use converts a two-layer link into a full
// three-layer one, with NO new content.
//
// HONESTY (CONTENT_STYLE.md): every item is an existing, verified record of the
// INDIVIDUAL's own bill or documented work. Only the issueKey is set/relabeled;
// no headline, fact, source, or media is touched. Idempotent — an item is only
// changed when it still lacks the target key (or holds the `from` key).
//
//   node scripts/refine-stance-specificity-jun2026.mjs            # dry run
//   node scripts/refine-stance-specificity-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');

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

// ── Alignments ──────────────────────────────────────────────────────────────
// id       : Firestore document id
// match    : a unique substring of the existing item's headline
// issueKey : the SPECIFIC key the member's stance + promise already share
// from     : (optional) only relabel if the item currently carries this key;
//            otherwise the item is only tagged when it has NO issueKey yet.
const ALIGN = [
  // Steve Eliason — his entire health record (988 crisis line, school & youth
  // mental health, behavioral-health workforce, correctional mental health) was
  // refined healthcare → health_mental this pass; his Spotlight bill follows.
  { id: 'seliason',        match: 'correctional mental-health care bill',          issueKey: 'health_mental',       from: 'healthcare' },
  // Evan Vickers — pharmacist; stance "Prescription Drug Costs" + promise "Rein
  // in pharmacy benefit managers (PBMs)" already on health_drug_prices.
  { id: 'evickers',        match: 'regulated pharmacy benefit managers',           issueKey: 'health_drug_prices' },
  // Angela Romero — stance "Victim Advocacy & Justice"/MMIR + promises (rape-kit
  // backlog, MMIR, victim services) already on justice_reform.
  { id: 'aromero',         match: 'rape-kit backlog and created the MMIR',         issueKey: 'justice_reform' },
  // Casey Snider — stance "Great Salt Lake" + promises (refill the lake, modernize
  // water law, reverse the lake's decline) already on water.
  { id: 'csnider',         match: 'homeless campus over Great Salt Lake',          issueKey: 'water' },
  // Kirk Cullimore — stance "Consumer Data Privacy" (Utah Consumer Privacy Act,
  // AI-disclosure law) + promise "Strengthen consumer and data-privacy" on
  // privacy_rights.
  { id: 'kcullimore',      match: 'generative-AI consumer law',                    issueKey: 'privacy_rights' },
  // Trevor Lee — stance "Flags in Schools & Government" + promise "Restrict
  // political and pride flags on government property" already on lgbtq_rights.
  { id: 'tlee',            match: 'flag-display ban (HB77)',                       issueKey: 'lgbtq_rights' },
  // Jake Fitisemanu — public-health professional; stance "Healthcare & Public
  // Health"/"Community Health Equity" + promise "Make Pacific Islander health
  // visible in state data" on healthcare.
  { id: 'jake_fitisemanu', match: 'Traditional Healing Amendments',               issueKey: 'healthcare' },
  // Ann Millner — stance "Workforce Development" + promise "Align higher education
  // with workforce needs" already on edu_balance.
  { id: 'amillner',        match: 'SB162 Talent Connect',                          issueKey: 'edu_balance' },
];

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  const d = await r.json();
  const out = {};
  for (const [k, v] of Object.entries(d.fields || {})) out[k] = dec(v);
  return out;
}
async function patchSpotlight(id, spotlight) {
  const url = `${BASE}/${id}?updateMask.fieldPaths=spotlight`;
  const body = { fields: { spotlight: enc(spotlight) } };
  const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${id} HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

async function run() {
  const ids = [...new Set(ALIGN.map((a) => a.id))];
  let aligned = 0, skipped = 0;
  const notes = [];

  for (const id of ids) {
    const doc = await getDoc(id);
    if (!doc) { notes.push(`✗ ${id}: document not found`); continue; }
    const spotlight = Array.isArray(doc.spotlight) ? doc.spotlight.map((s) => ({ ...s })) : [];
    let changed = false;

    for (const a of ALIGN.filter((a) => a.id === id)) {
      const it = spotlight.find((s) => s && String(s.headline || '').includes(a.match));
      if (!it) { notes.push(`✗ ${id}: no item matching "${a.match}"`); continue; }
      if (it.issueKey === a.issueKey) { skipped++; continue; }
      if (a.from) {
        if (it.issueKey === a.from) { it.issueKey = a.issueKey; changed = true; aligned++; notes.push(`  ↻ ${id}: "${a.match}" ${a.from} → ${a.issueKey}`); }
        else { notes.push(`• ${id}: "${a.match}" holds ${it.issueKey ?? 'none'}, expected ${a.from} — left as is`); }
      } else if (!it.issueKey) {
        it.issueKey = a.issueKey; changed = true; aligned++; notes.push(`  + ${id}: tagged "${a.match}" → ${a.issueKey}`);
      } else {
        notes.push(`• ${id}: "${a.match}" already holds ${it.issueKey} — left as is`);
      }
    }

    if (changed && APPLY) await patchSpotlight(id, spotlight);
  }

  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — aligned ${aligned}, skipped ${skipped} (already done)`);
  notes.forEach((n) => console.log(n));
  if (!APPLY) console.log('\nRe-run with --apply to write these changes to Firestore.');
}

run().catch((e) => { console.error('error:', e.message); process.exit(1); });
